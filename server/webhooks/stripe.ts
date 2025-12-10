import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb, createTenant, createPlatformLog } from "../db";
import { tenants, activationTokens } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { createEvolutionInstance } from "../evolution-integration";
import { cloneWorkflowForTenant } from "../n8n-integration";
import { sendActivationEmail } from "../email";

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
    evolutionData = await createEvolutionInstance(tenant.id);
    console.log(`[Provisioning] Evolution instance created: ${evolutionData.instanceName}`);
    
    // Atualizar tenant com dados Evolution
    await db.update(tenants)
      .set({
        evolutionInstanceName: evolutionData.instanceName,
        evolutionApiKey: evolutionData.apiKey,
        // chatwootInboxId será preenchido quando Evolution retornar
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

  // 5. Enviar email de ativação
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
