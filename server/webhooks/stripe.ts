import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb, createTenant, createPlatformLog, getPlanByStripePriceId } from "../db";
import { tenants, activationTokens, tenantCredits } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { createEvolutionInstance } from "../evolution-integration";
import { cloneWorkflowForTenant } from "../n8n-integration";
import { sendActivationEmail } from "../email";
import { findChatwootInboxByName } from "../chatwoot-integration";

const stripeApiKey = process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
if (stripeApiKey === "sk_test_dummy") {
  console.warn("[Stripe] Nenhuma chave encontrada. Usando chave dummy (modo dev sem Stripe).");
}

const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2025-11-17.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function handleStripeWebhook(req: Request, res: Response) {
  console.log("[Stripe Webhook] ===== WEBHOOK RECEIVED =====");
  console.log("[Stripe Webhook] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[Stripe Webhook] Body type:", typeof req.body);
  console.log("[Stripe Webhook] Body length:", req.body?.length);
  
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Stripe Webhook] Missing signature");
    return res.status(200).json({ verified: false, error: "Missing signature" });
  }

  let event: Stripe.Event;

  try {
    if (!webhookSecret) {
      console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurado. Pulando validação (modo desenvolvimento)');
      // Em desenvolvimento, podemos pular validação se secret não estiver configurado
      // Mas em produção, isso é obrigatório
      try {
        event = JSON.parse(req.body.toString());
      } catch {
        return res.status(400).json({ verified: false, error: 'Invalid JSON body' });
      }
    } else {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
      console.log('[Stripe Webhook] Signature validated successfully');
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return res.status(200).json({ verified: false, error: err.message });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  // Processar checkout completado
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    console.log("[Stripe Webhook] Processing checkout.session.completed", {
      sessionId: session.id,
      customerEmail: session.customer_email,
      metadata: session.metadata,
    });

    // Verificar se é compra de créditos extras
    if (session.metadata?.type === 'extra_credits') {
      try {
        await handleExtraCreditsPurchase(session);
        console.log("[Stripe Webhook] Extra credits purchased successfully");
      } catch (error: any) {
        console.error("[Stripe Webhook] Failed to process extra credits purchase:", error);
        await createPlatformLog({
          eventType: "extra_credits_failed",
          message: `Failed to process extra credits purchase: ${error.message}`,
          metadata: JSON.stringify({ sessionId: session.id, error: error.message }),
        });
      }
    } else {
      // Provisionamento normal de tenant
      try {
        await provisionTenantFromCheckout(session);
        console.log("[Stripe Webhook] Tenant provisioned successfully");
      } catch (error: any) {
        console.error("[Stripe Webhook] Failed to provision tenant:", error);
        await createPlatformLog({
          eventType: "provisioning_failed",
          message: `Failed to provision tenant from Stripe checkout: ${error.message}`,
          metadata: JSON.stringify({ sessionId: session.id, error: error.message }),
        });
        // Still return 200 to acknowledge receipt
      }
    }
  }

  res.status(200).json({ verified: true, received: true });
}

export async function provisionTenantFromCheckout(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const email = session.customer_email;
  const planId = session.metadata?.planId;
  const companyName = session.metadata?.companyName || email?.split("@")[0] || "Cliente";

  if (!email) {
    throw new Error("No customer email in checkout session");
  }

  if (!planId) {
    throw new Error("No planId in checkout session metadata");
  }

  console.log(`[Provisioning] Creating tenant for ${email}, plan ${planId}`);

  // 1. Criar tenant no banco
  const tenant = await createTenant({
    ownerId: 1, // Owner padrão (admin)
    companyName,
    email,
    subdomain: companyName.toLowerCase().replace(/[^a-z0-9]/g, "") || undefined,
    currentPlanId: parseInt(planId),
    status: "suspended" as const, // Cliente ainda não ativou a conta
    stripeCustomerId: (session.customer as string) || undefined,
    stripeSubscriptionId: (session.subscription as string) || undefined,
  });

  console.log(`[Provisioning] Tenant created with ID: ${tenant.id}`);

  // 2. Provisionar Evolution API
  let evolutionData;
  try {
    evolutionData = await createEvolutionInstance(tenant.id, companyName);
    console.log(`[Provisioning] Evolution instance created: ${evolutionData.instanceName}`);
    
    // Buscar inboxId criado pelo Evolution (pode levar alguns segundos para aparecer)
    let chatwootInboxId: number | null = null;
    try {
      // Aguardar um pouco para o Evolution criar o inbox
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Tentar buscar pelo nome (Evolution usa o nome que passamos)
      chatwootInboxId = await findChatwootInboxByName(companyName);
      
      if (chatwootInboxId) {
        console.log(`[Provisioning] Chatwoot inbox found: ${chatwootInboxId}`);
      } else {
        console.log(`[Provisioning] Chatwoot inbox not found immediately (may be created later)`);
      }
    } catch (error: any) {
      console.warn(`[Provisioning] Error finding inbox (non-critical):`, error.message);
    }
    
    // Atualizar tenant com dados Evolution
    await db.update(tenants)
      .set({
        evolutionInstanceName: evolutionData.instanceName,
        evolutionApiKey: evolutionData.apiKey,
        chatwootInboxId: chatwootInboxId || undefined,
      })
      .where(eq(tenants.id, tenant.id));
  } catch (error: any) {
    console.error(`[Provisioning] Evolution failed:`, error);
    await createPlatformLog({
      tenantId: tenant.id,
      eventType: "evolution_failed",
      message: `Failed to create Evolution instance: ${error.message}`,
      metadata: JSON.stringify({ error: error.message }),
    });
  }

  // 3. Provisionar N8N Workflow (só se Evolution foi criado)
  if (evolutionData?.instanceName) {
    try {
      const workflowData = await cloneWorkflowForTenant(tenant.id, companyName, evolutionData.instanceName);
      console.log(`[Provisioning] N8N workflow created: ${workflowData.workflowId}`);
      
      // Atualizar tenant com dados N8N
      await db.update(tenants)
        .set({
          n8nWorkflowId: workflowData.workflowId,
        })
        .where(eq(tenants.id, tenant.id));
    } catch (error: any) {
      console.error(`[Provisioning] N8N failed:`, error);
      await createPlatformLog({
        tenantId: tenant.id,
        eventType: "n8n_failed",
        message: `Failed to clone N8N workflow: ${error.message}`,
        metadata: JSON.stringify({ error: error.message }),
      });
    }
  } else {
    console.warn(`[Provisioning] N8N skipped: Evolution instance not created`);
  }

  // 4. Gerar token de ativação
  const activationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  
  await db.insert(activationTokens).values({
    tenantId: tenant.id,
    token: activationToken,
    expiresAt,
  });
  
  console.log(`[Provisioning] Activation token created: ${activationToken}`);

  // 5. Atribuir créditos mensais do plano
  try {
    const plan = await getPlanByStripePriceId(session.price?.id as string || "");
    if (plan?.monthlyCredits) {
      console.log(`[Provisioning] Atribuindo ${plan.monthlyCredits} créditos do plano ${plan.name}`);
      
      // Buscar ou criar registro de créditos
      const existingCredits = await db
        .select()
        .from(tenantCredits)
        .where(eq(tenantCredits.tenantId, tenant.id))
        .limit(1);
      
      if (existingCredits[0]) {
        // Adicionar créditos mensais ao saldo atual
        await db
          .update(tenantCredits)
          .set({
            currentCredits: sql`${tenantCredits.currentCredits} + ${plan.monthlyCredits}`,
            totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${plan.monthlyCredits}`,
            updatedAt: new Date(),
          })
          .where(eq(tenantCredits.tenantId, tenant.id));
        
        console.log(`[Provisioning] ✅ Créditos atualizados. Novo saldo: ${existingCredits[0].currentCredits + plan.monthlyCredits}`);
      } else {
        // Criar registro inicial
        await db.insert(tenantCredits).values({
          tenantId: tenant.id,
          currentCredits: plan.monthlyCredits,
          totalCreditsPurchased: plan.monthlyCredits,
        });
        
        console.log(`[Provisioning] ✅ Registro de créditos criado. Saldo inicial: ${plan.monthlyCredits}`);
      }
      
      await createPlatformLog({
        tenantId: tenant.id,
        eventType: "credits_assigned",
        message: `${plan.monthlyCredits} créditos atribuídos do plano ${plan.name}`,
        metadata: JSON.stringify({ planId: plan.id, monthlyCredits: plan.monthlyCredits }),
      });
    } else {
      console.warn(`[Provisioning] ⚠️ Plano não encontrado ou sem créditos mensais configurados`);
    }
  } catch (error: any) {
    console.error(`[Provisioning] Erro ao atribuir créditos:`, error);
    await createPlatformLog({
      tenantId: tenant.id,
      eventType: "credits_assignment_failed",
      message: `Failed to assign credits: ${error.message}`,
      metadata: JSON.stringify({ error: error.message }),
    });
  }

  // 6. Enviar email de ativação
  try {
    await sendActivationEmail(email, activationToken, companyName);
    console.log(`[Provisioning] Activation email sent to ${email}`);
    
    await createPlatformLog({
      tenantId: tenant.id,
      eventType: "tenant_created",
      message: `Tenant created and activation email sent to ${email}`,
      metadata: JSON.stringify({ email, planId }),
    });
  } catch (error: any) {
    console.error(`[Provisioning] Email failed:`, error);
    await createPlatformLog({
      tenantId: tenant.id,
      eventType: "email_failed",
      message: `Failed to send activation email: ${error.message}`,
      metadata: JSON.stringify({ error: error.message }),
    });
  }

  return tenant;
}

/**
 * Processa compra de créditos extras
 */
async function handleExtraCreditsPurchase(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tenantId = session.metadata?.tenantId;
  const creditsAmount = session.metadata?.creditsAmount;

  if (!tenantId || !creditsAmount) {
    throw new Error("Missing tenantId or creditsAmount in session metadata");
  }

  const creditsToAdd = parseInt(creditsAmount);
  if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
    throw new Error("Invalid creditsAmount");
  }

  console.log(`[Extra Credits] Adicionando ${creditsToAdd} créditos extras para tenant ${tenantId}`);

  // Buscar ou criar registro de créditos
  const existingCredits = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, parseInt(tenantId)))
    .limit(1);

  if (existingCredits[0]) {
    // Adicionar créditos extras ao saldo atual
    await db
      .update(tenantCredits)
      .set({
        currentCredits: sql`${tenantCredits.currentCredits} + ${creditsToAdd}`,
        totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${creditsToAdd}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantCredits.tenantId, parseInt(tenantId)));

    console.log(`[Extra Credits] ✅ Créditos atualizados. Novo saldo: ${existingCredits[0].currentCredits + creditsToAdd}`);
  } else {
    // Criar registro inicial
    await db.insert(tenantCredits).values({
      tenantId: parseInt(tenantId),
      currentCredits: creditsToAdd,
      totalCreditsPurchased: creditsToAdd,
    });

    console.log(`[Extra Credits] ✅ Registro de créditos criado. Saldo inicial: ${creditsToAdd}`);
  }

  // Criar log
  await createPlatformLog({
    tenantId: parseInt(tenantId),
    eventType: "extra_credits_purchased",
    message: `${creditsToAdd} créditos extras comprados`,
    metadata: JSON.stringify({
      sessionId: session.id,
      creditsAmount: creditsToAdd,
      amountPaid: session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00',
    }),
  });
}

/**
 * Processa compra de créditos extras
 */
async function handleExtraCreditsPurchase(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tenantId = session.metadata?.tenantId;
  const creditsAmount = session.metadata?.creditsAmount;

  if (!tenantId || !creditsAmount) {
    throw new Error("Missing tenantId or creditsAmount in session metadata");
  }

  const creditsToAdd = parseInt(creditsAmount);
  if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
    throw new Error("Invalid creditsAmount");
  }

  console.log(`[Extra Credits] Adicionando ${creditsToAdd} créditos extras para tenant ${tenantId}`);

  // Buscar ou criar registro de créditos
  const existingCredits = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, parseInt(tenantId)))
    .limit(1);

  if (existingCredits[0]) {
    // Adicionar créditos extras ao saldo atual
    await db
      .update(tenantCredits)
      .set({
        currentCredits: sql`${tenantCredits.currentCredits} + ${creditsToAdd}`,
        totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${creditsToAdd}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantCredits.tenantId, parseInt(tenantId)));

    console.log(`[Extra Credits] ✅ Créditos atualizados. Novo saldo: ${existingCredits[0].currentCredits + creditsToAdd}`);
  } else {
    // Criar registro inicial
    await db.insert(tenantCredits).values({
      tenantId: parseInt(tenantId),
      currentCredits: creditsToAdd,
      totalCreditsPurchased: creditsToAdd,
    });

    console.log(`[Extra Credits] ✅ Registro de créditos criado. Saldo inicial: ${creditsToAdd}`);
  }

  // Criar log
  await createPlatformLog({
    tenantId: parseInt(tenantId),
    eventType: "extra_credits_purchased",
    message: `${creditsToAdd} créditos extras comprados`,
    metadata: JSON.stringify({
      sessionId: session.id,
      creditsAmount: creditsToAdd,
      amountPaid: session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00',
    }),
  });
}
