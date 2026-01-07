import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb, createTenant, createPlatformLog, getPlanByStripePriceId, getPlanById, createAgent, getAgentById, updateAgent } from "../db";
import { tenants, activationTokens, tenantCredits } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { createEvolutionInstance, deleteEvolutionInstance } from "../evolution-integration";
import { cloneWorkflowForTenant } from "../n8n-integration";
import { sendActivationEmail } from "../email";
import { findChatwootInboxByName, createChatwootAgent, createOrUpdateChatwootAgentBot, connectAgentBotToInbox } from "../chatwoot-integration";

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
      console.log("[Stripe Webhook] 🎯 Processando compra de créditos extras", {
        sessionId: session.id,
        tenantId: session.metadata?.tenantId,
        creditsAmount: session.metadata?.creditsAmount,
        allMetadata: JSON.stringify(session.metadata),
      });
      try {
        await handleExtraCreditsPurchase(session);
        console.log("[Stripe Webhook] ✅ Créditos extras processados com sucesso");
      } catch (error: any) {
        console.error("[Stripe Webhook] ❌ Erro ao processar compra de créditos extras:", error);
        console.error("[Stripe Webhook] ❌ Stack trace:", error.stack);
        await createPlatformLog({
          tenantId: session.metadata?.tenantId ? parseInt(session.metadata.tenantId) : undefined,
          eventType: "extra_credits_failed",
          severity: "error",
          message: `Failed to process extra credits purchase: ${error.message}`,
          metadata: JSON.stringify({ 
            sessionId: session.id, 
            error: error.message,
            stack: error.stack,
            metadata: session.metadata,
          }),
        });
      }
    } else {
      // Verificar se é upgrade de plano (tenant já existe)
      const tenantId = session.metadata?.tenant_id;
      if (tenantId) {
        try {
          await handlePlanUpgrade(session);
          console.log("[Stripe Webhook] ✅ Upgrade de plano processado com sucesso");
        } catch (error: any) {
          console.error("[Stripe Webhook] ❌ Erro ao processar upgrade:", error);
          // Tentar provisionamento normal como fallback
          try {
            await provisionTenantFromCheckout(session);
            console.log("[Stripe Webhook] Tenant provisioned successfully (fallback)");
          } catch (fallbackError: any) {
            console.error("[Stripe Webhook] Failed to provision tenant:", fallbackError);
            await createPlatformLog({
              eventType: "provisioning_failed",
              message: `Failed to provision tenant from Stripe checkout: ${fallbackError.message}`,
              metadata: JSON.stringify({ sessionId: session.id, error: fallbackError.message }),
            });
          }
        }
      } else {
        // Provisionamento normal de tenant (novo)
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
        }
      }
    }
  }

  // Processar atualização de assinatura (upgrade/downgrade)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    console.log("[Stripe Webhook] Processing customer.subscription.updated", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });
    
    try {
      await handleSubscriptionUpdated(subscription);
      console.log("[Stripe Webhook] ✅ Assinatura atualizada com sucesso");
    } catch (error: any) {
      console.error("[Stripe Webhook] ❌ Erro ao atualizar assinatura:", error);
      await createPlatformLog({
        eventType: "subscription_update_failed",
        message: `Failed to update subscription: ${error.message}`,
        metadata: JSON.stringify({ subscriptionId: subscription.id, error: error.message }),
      });
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

  // 2. Criar agente PRIMEIRO (sem Evolution ainda)
  console.log(`[Provisioning] 🚀 Criando agente para tenant ${tenant.id}...`);
  let agent;
  try {
    agent = await createAgent({
      tenantId: tenant.id,
      name: companyName || `Agente ${tenant.id}`,
      evolutionInstanceName: null, // Será criado depois
      evolutionApiKey: null,
      n8nWorkflowId: null, // Será criado depois
      chatwootInboxId: null, // Será criado depois
      isActive: false,
      status: "active" as const,
    });
    console.log(`[Provisioning] ✅ Agente criado: ID=${agent.id}, Nome=${agent.name}`);
  } catch (error: any) {
    console.error(`[Provisioning] ❌ Erro ao criar agente:`, error);
    throw error; // Falhar se não conseguir criar agente
  }

  // 3. Criar Evolution com nome correto: agent_${agentId}
  const evolutionInstanceName = `agent_${agent.id}`;
  console.log(`[Provisioning] 📱 Criando Evolution: ${evolutionInstanceName}...`);
  let evolutionData;
  let chatwootInboxId: number | null = null;
  
  try {
    const axios = (await import('axios')).default;
    const evolutionApi = axios.create({
      baseURL: process.env.EVOLUTION_API_URL || "",
      headers: {
        "apikey": process.env.EVOLUTION_API_KEY || ""
      },
      timeout: 30000,
    });
    
    const evolutionResponse = await evolutionApi.post("/instance/create", {
      instanceName: evolutionInstanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      chatwootAccountId: process.env.CHATWOOT_ACCOUNT_ID || "1",
      chatwootToken: process.env.CHATWOOT_API_TOKEN,
      chatwootUrl: process.env.CHATWOOT_URL,
      chatwootSignMsg: true,
      chatwootReopenConversation: true,
      chatwootConversationPending: false,
      chatwootImportContacts: true,
      chatwootNameInbox: agent.name,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false
    });
    
    evolutionData = {
      instanceName: evolutionResponse.data.instance.instanceName || evolutionInstanceName,
      apiKey: evolutionResponse.data.hash || "",
    };
    
    console.log(`[Provisioning] ✅ Evolution criado: ${evolutionData.instanceName}`);
    
    // Atualizar agente com Evolution
    await updateAgent(agent.id, {
      evolutionInstanceName: evolutionData.instanceName,
      evolutionApiKey: evolutionData.apiKey,
    });
    
    // Buscar inboxId criado pelo Evolution (aguardar um pouco)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      chatwootInboxId = await findChatwootInboxByName(agent.name);
      if (chatwootInboxId) {
        console.log(`[Provisioning] ✅ Chatwoot inbox encontrado: ${chatwootInboxId}`);
        await updateAgent(agent.id, {
          chatwootInboxId: chatwootInboxId,
        });
      }
    } catch (error: any) {
      console.warn(`[Provisioning] ⚠️ Erro ao buscar inbox (não crítico):`, error.message);
    }
    
  } catch (error: any) {
    console.error(`[Provisioning] ❌ Erro ao criar Evolution:`, error);
    await createPlatformLog({
      tenantId: tenant.id,
      eventType: "evolution_failed",
      message: `Failed to create Evolution instance: ${error.message}`,
      metadata: JSON.stringify({ error: error.message, agentId: agent.id }),
    });
    // Continuar mesmo se Evolution falhar
  }

  // 4. Criar workflow N8N com Evolution correto e webhook padronizado
  let workflowData: { workflowId: string; webhookUrl: string } | null = null;
  if (evolutionData?.instanceName) {
    try {
      console.log(`[Provisioning] 🔄 Criando workflow N8N com webhook padronizado...`);
      workflowData = await cloneWorkflowForTenant(
        tenant.id,
        companyName,
        evolutionData.instanceName,
        agent.id, // Passar agentId para criar webhook padronizado
        companyName
      );
      
      // Atualizar agente com workflow
      await updateAgent(agent.id, {
        n8nWorkflowId: workflowData.workflowId,
      });
      
      console.log(`[Provisioning] ✅ Workflow N8N criado: ${workflowData.workflowId}, Webhook: ${workflowData.webhookUrl}`);
    } catch (error: any) {
      console.error(`[Provisioning] ❌ Erro ao criar workflow N8N:`, error);
      await createPlatformLog({
        tenantId: tenant.id,
        eventType: "n8n_failed",
        message: `Failed to clone N8N workflow: ${error.message}`,
        metadata: JSON.stringify({ error: error.message, agentId: agent.id }),
      });
    }
  } else {
    console.warn(`[Provisioning] ⚠️ Workflow N8N pulado: Evolution não foi criado`);
  }
      
  // 5. Criar Agent Bot e Webhook no Chatwoot (CRÍTICO)
  // Buscar agente atualizado com todos os dados
  const finalAgent = await getAgentById(agent.id);
  
  if (finalAgent?.chatwootInboxId && workflowData?.workflowId) {
    try {
      console.log(`[Provisioning] 🤖 Criando Agent Bot e Webhook no Chatwoot...`);
      const n8nApiUrl = process.env.N8N_API_URL;
      if (!n8nApiUrl) {
        console.warn(`[Provisioning] ⚠️ N8N_API_URL não configurado, pulando criação de webhook`);
      } else {
        // Usar formato padronizado: tenant_${tenantId}/agent_${agentId}
        const agentWebhookUrl = `${n8nApiUrl}/webhook/tenant_${tenant.id}/agent_${agent.id}`;
        const botName = `Agente ${companyName || `Tenant ${tenant.id}`}`;
        
        console.log(`[Provisioning] 📍 Webhook URL: ${agentWebhookUrl}`);
        
        // Criar Agent Bot com webhook usando formato padronizado
        const agentBot = await createOrUpdateChatwootAgentBot(
          botName,
          agentWebhookUrl,
          `Agent bot para ${companyName || `Tenant ${tenant.id}`} - gerado automaticamente`
        );
        
        console.log(`[Provisioning] ✅ Agent Bot criado: ID=${agentBot.id}, Token=${agentBot.token ? 'SIM' : 'NÃO'}`);
        
        // Salvar no tenant (compartilhado entre agentes)
        const dbInstance = await getDb();
        await dbInstance.update(tenants)
          .set({
            chatwootAgentBotId: agentBot.id,
            chatwootAgentBotToken: agentBot.token || undefined,
          })
          .where(eq(tenants.id, tenant.id));
        
        console.log(`[Provisioning] ✅ Agent Bot salvo no tenant ${tenant.id}`);
        
        // Conectar Agent Bot ao inbox
        try {
          await connectAgentBotToInbox(finalAgent.chatwootInboxId, agentBot.id);
          console.log(`[Provisioning] ✅ Agent Bot conectado ao inbox ${finalAgent.chatwootInboxId}`);
        } catch (connectError: any) {
          console.warn(`[Provisioning] ⚠️ Erro ao conectar Agent Bot ao inbox (não crítico):`, connectError.message);
        }
        
        // Criar webhook no Chatwoot via N8N workflow (método que funcionava antes)
        const createWebhookWorkflowUrl = process.env.N8N_CREATE_WEBHOOK_WORKFLOW_URL;
        if (createWebhookWorkflowUrl) {
          try {
            const axios = (await import('axios')).default;
            const chatwootUrl = process.env.CHATWOOT_URL;
            const chatwootToken = process.env.CHATWOOT_API_TOKEN;
            const chatwootAccountId = process.env.CHATWOOT_ACCOUNT_ID;
            
            if (chatwootUrl && chatwootToken && chatwootAccountId) {
              await axios.post(createWebhookWorkflowUrl, {
                tenantId: tenant.id,
                agentId: agent.id,
                webhookUrl: agentWebhookUrl,
                chatwootAccountId,
                chatwootUrl,
                chatwootToken,
                action: 'activate',
                timestamp: new Date().toISOString(),
              }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000,
              });
              
              console.log(`[Provisioning] ✅ Webhook criado no Chatwoot via N8N workflow: ${agentWebhookUrl}`);
            } else {
              console.warn(`[Provisioning] ⚠️ Variáveis do Chatwoot não configuradas, pulando criação de webhook`);
            }
          } catch (webhookError: any) {
            console.error(`[Provisioning] ❌ Erro ao criar webhook via N8N workflow:`, webhookError.message);
            console.error(`[Provisioning] URL chamada: ${createWebhookWorkflowUrl}`);
            console.error(`[Provisioning] Erro completo:`, webhookError.response?.data || webhookError.message);
            // Não falhar provisionamento, mas logar erro
            await createPlatformLog({
              tenantId: tenant.id,
              eventType: "webhook_creation_failed",
              message: `Failed to create webhook in Chatwoot via N8N: ${webhookError.message}`,
              metadata: JSON.stringify({ error: webhookError.message, agentId: agent.id, webhookUrl: agentWebhookUrl }),
            });
          }
        } else {
          console.warn(`[Provisioning] ⚠️ N8N_CREATE_WEBHOOK_WORKFLOW_URL não configurado, pulando criação de webhook`);
        }
        
        await createPlatformLog({
          tenantId: tenant.id,
          eventType: "agent_bot_created",
          message: `Agent Bot e Webhook criados automaticamente durante provisionamento`,
          metadata: JSON.stringify({ agentBotId: agentBot.id, agentId: agent.id, inboxId: finalAgent.chatwootInboxId, webhookUrl: agentWebhookUrl }),
        });
      }
    } catch (error: any) {
      console.error(`[Provisioning] ❌ Erro ao criar Agent Bot/Webhook:`, error);
      await createPlatformLog({
        tenantId: tenant.id,
        eventType: "agent_bot_creation_failed",
        message: `Failed to create Agent Bot/Webhook: ${error.message}`,
        metadata: JSON.stringify({ error: error.message, agentId: agent.id }),
      });
    }
  } else {
    console.warn(`[Provisioning] ⚠️ Inbox ou Workflow não disponível, pulando criação de Agent Bot/Webhook`);
    console.warn(`[Provisioning] chatwootInboxId: ${finalAgent?.chatwootInboxId}, workflowId: ${workflowData?.workflowId}`);
  }
  
  // 6. Atribuir créditos mensais do plano PRIMEIRO (antes de qualquer uso)
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
        // IMPORTANTE: Não adicionar créditos mensais ao currentCredits se já foram atribuídos antes
        // Os créditos mensais são resetados mensalmente, não acumulados
        // Se o tenant já tem créditos, apenas atualizar totalCreditsPurchased para histórico
        // Mas NÃO adicionar ao currentCredits (para evitar duplicação)
        
        // Verificar se já recebeu créditos mensais este mês (via lastResetDate)
        const lastReset = existingCredits[0].lastResetDate;
        const now = new Date();
        const isSameMonth = lastReset && 
          lastReset.getFullYear() === now.getFullYear() && 
          lastReset.getMonth() === now.getMonth();
        
        if (!isSameMonth) {
          // Se não recebeu créditos este mês, adicionar ao currentCredits
          await db
            .update(tenantCredits)
            .set({
              currentCredits: sql`${tenantCredits.currentCredits} + ${plan.monthlyCredits}`,
              totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${plan.monthlyCredits}`,
              lastResetDate: now,
              updatedAt: new Date(),
            })
            .where(eq(tenantCredits.tenantId, tenant.id));
          
          console.log(`[Provisioning] ✅ Créditos mensais adicionados. Novo saldo: ${existingCredits[0].currentCredits + plan.monthlyCredits}`);
        } else {
          // Já recebeu créditos este mês, apenas atualizar totalCreditsPurchased para histórico
          await db
            .update(tenantCredits)
            .set({
              totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${plan.monthlyCredits}`,
              updatedAt: new Date(),
            })
            .where(eq(tenantCredits.tenantId, tenant.id));
          
          console.log(`[Provisioning] ✅ Créditos mensais já atribuídos este mês. Apenas atualizado histórico.`);
        }
      } else {
        // Criar registro inicial com créditos mensais
        await db.insert(tenantCredits).values({
          tenantId: tenant.id,
          currentCredits: plan.monthlyCredits,
          totalCreditsPurchased: plan.monthlyCredits,
          lastResetDate: new Date(),
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

  // 7. Gerar token de ativação
  const activationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  
  await db.insert(activationTokens).values({
    tenantId: tenant.id,
    token: activationToken,
    expiresAt,
  });
  
  console.log(`[Provisioning] Activation token created: ${activationToken}`);

  // 8. Log final do agente criado e verificar recursos
  const finalAgentCheck = await getAgentById(agent.id);
  await createPlatformLog({
    tenantId: tenant.id,
    eventType: "agent_created",
    message: `Agente criado automaticamente durante provisionamento: ${finalAgentCheck?.name || agent.name}`,
    metadata: JSON.stringify({ 
      agentId: agent.id, 
      evolutionInstance: finalAgentCheck?.evolutionInstanceName,
      n8nWorkflow: finalAgentCheck?.n8nWorkflowId,
      chatwootInbox: finalAgentCheck?.chatwootInboxId,
    }),
  });

  // 9. Enviar email de ativação APENAS se tudo estiver funcionando
  // Verificar se recursos críticos foram criados
  const hasEvolution = finalAgentCheck?.evolutionInstanceName && finalAgentCheck?.evolutionInstanceName.startsWith('agent_');
  const hasWorkflow = finalAgentCheck?.n8nWorkflowId;
  const hasInbox = finalAgentCheck?.chatwootInboxId;
  
  if (hasEvolution && hasWorkflow && hasInbox) {
    try {
      await sendActivationEmail(email, activationToken, companyName);
      console.log(`[Provisioning] ✅ Activation email sent to ${email} (tudo funcionando)`);
      
      await createPlatformLog({
        tenantId: tenant.id,
        eventType: "tenant_created",
        message: `Tenant created and activation email sent to ${email}`,
        metadata: JSON.stringify({ email, planId, evolution: hasEvolution, workflow: hasWorkflow, inbox: hasInbox }),
      });
    } catch (error: any) {
      console.error(`[Provisioning] ❌ Erro ao enviar email:`, error);
      await createPlatformLog({
        tenantId: tenant.id,
        eventType: "email_failed",
        message: `Failed to send activation email: ${error.message}`,
        metadata: JSON.stringify({ error: error.message }),
      });
    }
  } else {
    console.warn(`[Provisioning] ⚠️ Email NÃO enviado - recursos não estão completos:`);
    console.warn(`[Provisioning] - Evolution: ${hasEvolution ? '✅' : '❌'}`);
    console.warn(`[Provisioning] - Workflow: ${hasWorkflow ? '✅' : '❌'}`);
    console.warn(`[Provisioning] - Inbox: ${hasInbox ? '✅' : '❌'}`);
    
    await createPlatformLog({
      tenantId: tenant.id,
      eventType: "email_not_sent",
      message: `Email não enviado - recursos incompletos. Evolution: ${hasEvolution}, Workflow: ${hasWorkflow}, Inbox: ${hasInbox}`,
      metadata: JSON.stringify({ evolution: hasEvolution, workflow: hasWorkflow, inbox: hasInbox }),
    });
  }

  return tenant;
}

/**
 * Processa upgrade/downgrade de plano
 */
async function handlePlanUpgrade(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tenantId = session.metadata?.tenant_id;
  if (!tenantId) {
    throw new Error("No tenant_id in checkout session metadata");
  }

  // Buscar tenant
  const tenantResult = await db.select().from(tenants).where(eq(tenants.id, parseInt(tenantId))).limit(1);
  if (!tenantResult[0]) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const tenant = tenantResult[0];

  // Buscar plano pelo planId no metadata ou pelo priceId da subscription
  let plan;
  if (session.metadata?.planId) {
    plan = await getPlanById(parseInt(session.metadata.planId));
  } else {
    // Buscar subscription no Stripe para pegar o priceId atual
    const subscriptionId = session.subscription as string;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) {
        plan = await getPlanByStripePriceId(priceId);
      }
    }
  }

  if (!plan) {
    throw new Error("Plan not found in metadata or subscription");
  }

  console.log(`[Plan Upgrade] Atualizando tenant ${tenantId} para plano ${plan.name} (ID: ${plan.id})`);

  // Atualizar tenant com novo plano
  const subscriptionId = session.subscription as string;
  await db.update(tenants)
    .set({
      currentPlanId: plan.id,
      stripeSubscriptionId: subscriptionId || tenant.stripeSubscriptionId || undefined,
      subscriptionStatus: subscriptionId ? ('active' as const) : (tenant.subscriptionStatus || undefined),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, parseInt(tenantId)));

  // Atualizar créditos se necessário (diferença entre planos)
  const existingCredits = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, parseInt(tenantId)))
    .limit(1);

  if (existingCredits[0] && plan.monthlyCredits) {
    // Calcular diferença de créditos (novo plano - plano antigo)
    const oldPlan = tenant.currentPlanId ? await getPlanById(tenant.currentPlanId) : null;
    const oldMonthlyCredits = oldPlan?.monthlyCredits || 0;
    const creditDifference = plan.monthlyCredits - oldMonthlyCredits;

    if (creditDifference !== 0) {
      console.log(`[Plan Upgrade] Ajustando créditos: ${oldMonthlyCredits} → ${plan.monthlyCredits} (diferença: ${creditDifference})`);
      
      await db
        .update(tenantCredits)
        .set({
          currentCredits: sql`${tenantCredits.currentCredits} + ${creditDifference}`,
          updatedAt: new Date(),
        })
        .where(eq(tenantCredits.tenantId, parseInt(tenantId)));
    }
  }

  await createPlatformLog({
    tenantId: parseInt(tenantId),
    eventType: "plan_upgraded",
    severity: "info",
    message: `Plano atualizado para ${plan.name} (ID: ${plan.id})`,
    metadata: JSON.stringify({
      oldPlanId: tenant.currentPlanId,
      newPlanId: plan.id,
      subscriptionId: subscriptionId,
    }),
  });

  console.log(`[Plan Upgrade] ✅ Tenant ${tenantId} atualizado para plano ${plan.name}`);
}

/**
 * Processa atualização de assinatura (webhook customer.subscription.updated)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar tenant pela subscription ID
  const tenantResult = await db
    .select()
    .from(tenants)
    .where(eq(tenants.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!tenantResult[0]) {
    console.warn(`[Subscription Updated] Tenant not found for subscription: ${subscription.id}`);
    return;
  }

  const tenant = tenantResult[0];

  // Buscar priceId atual da subscription
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.warn(`[Subscription Updated] No price ID in subscription: ${subscription.id}`);
    return;
  }

  // Buscar plano pelo priceId
  const plan = await getPlanByStripePriceId(priceId);
  if (!plan) {
    console.warn(`[Subscription Updated] Plan not found for price ID: ${priceId}`);
    return;
  }

  // Verificar se o plano mudou
  const planChanged = tenant.currentPlanId !== plan.id;

  console.log(`[Subscription Updated] Atualizando tenant ${tenant.id}`, {
    subscriptionId: subscription.id,
    oldPlanId: tenant.currentPlanId,
    newPlanId: plan.id,
    planChanged,
    status: subscription.status,
  });

  // Atualizar tenant
  await db.update(tenants)
    .set({
      currentPlanId: plan.id,
      subscriptionStatus: (subscription.status === 'active' || subscription.status === 'past_due' || subscription.status === 'canceled' || subscription.status === 'incomplete' || subscription.status === 'trialing') 
        ? (subscription.status as 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing')
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));

  // Se o plano mudou, ajustar créditos
  if (planChanged && plan.monthlyCredits) {
    const existingCredits = await db
      .select()
      .from(tenantCredits)
      .where(eq(tenantCredits.tenantId, tenant.id))
      .limit(1);

    if (existingCredits[0]) {
      const oldPlan = tenant.currentPlanId ? await getPlanById(tenant.currentPlanId) : null;
      const oldMonthlyCredits = oldPlan?.monthlyCredits || 0;
      const creditDifference = plan.monthlyCredits - oldMonthlyCredits;

      if (creditDifference !== 0) {
        console.log(`[Subscription Updated] Ajustando créditos: ${oldMonthlyCredits} → ${plan.monthlyCredits} (diferença: ${creditDifference})`);
        
        await db
          .update(tenantCredits)
          .set({
            currentCredits: sql`${tenantCredits.currentCredits} + ${creditDifference}`,
            updatedAt: new Date(),
          })
          .where(eq(tenantCredits.tenantId, tenant.id));
      }
    }
  }

  await createPlatformLog({
    tenantId: tenant.id,
    eventType: "subscription_updated",
    severity: "info",
    message: `Assinatura atualizada. Plano: ${plan.name} (ID: ${plan.id}), Status: ${subscription.status}`,
    metadata: JSON.stringify({
      subscriptionId: subscription.id,
      oldPlanId: tenant.currentPlanId,
      newPlanId: plan.id,
      status: subscription.status,
    }),
  });

  console.log(`[Subscription Updated] ✅ Tenant ${tenant.id} atualizado`);
}

/**
 * Processa compra de créditos extras
 */
async function handleExtraCreditsPurchase(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[Extra Credits] 📋 Metadata recebido:`, JSON.stringify(session.metadata, null, 2));
  
  const tenantId = session.metadata?.tenantId;
  const creditsAmount = session.metadata?.creditsAmount;

  console.log(`[Extra Credits] 🔍 Valores extraídos:`, {
    tenantId,
    creditsAmount,
    tenantIdType: typeof tenantId,
    creditsAmountType: typeof creditsAmount,
  });

  if (!tenantId || !creditsAmount) {
    const errorMsg = `Missing tenantId or creditsAmount in session metadata. tenantId: ${tenantId}, creditsAmount: ${creditsAmount}`;
    console.error(`[Extra Credits] ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const tenantIdNum = parseInt(tenantId.toString());
  const creditsToAdd = parseInt(creditsAmount.toString());
  
  console.log(`[Extra Credits] 🔢 Valores convertidos:`, {
    tenantIdNum,
    creditsToAdd,
    tenantIdIsNaN: isNaN(tenantIdNum),
    creditsIsNaN: isNaN(creditsToAdd),
  });

  if (isNaN(tenantIdNum) || tenantIdNum <= 0) {
    throw new Error(`Invalid tenantId: ${tenantId}`);
  }

  if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
    throw new Error(`Invalid creditsAmount: ${creditsAmount}`);
  }

  console.log(`[Extra Credits] ✅ Adicionando ${creditsToAdd} créditos extras para tenant ${tenantIdNum}`);

  // Buscar ou criar registro de créditos
  console.log(`[Extra Credits] 🔍 Buscando créditos existentes para tenant ${tenantIdNum}...`);
  const existingCredits = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, tenantIdNum))
    .limit(1);

  console.log(`[Extra Credits] 📊 Créditos existentes encontrados:`, existingCredits.length > 0 ? 'Sim' : 'Não');

  if (existingCredits[0]) {
    // Adicionar créditos extras ao saldo atual
    const oldCredits = existingCredits[0].currentCredits || 0;
    const oldTotalPurchased = existingCredits[0].totalCreditsPurchased || 0;
    
    console.log(`[Extra Credits] 💾 Atualizando créditos para tenant ${tenantIdNum}...`);
    console.log(`[Extra Credits] 📊 Saldo anterior: ${oldCredits}, Total comprado anterior: ${oldTotalPurchased}`);
    console.log(`[Extra Credits] ➕ Créditos a adicionar: ${creditsToAdd}`);
    
    const updateResult = await db
      .update(tenantCredits)
      .set({
        currentCredits: sql`${tenantCredits.currentCredits} + ${creditsToAdd}`,
        totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${creditsToAdd}`,
        extrasPurchased: sql`${tenantCredits.extrasPurchased} + ${creditsToAdd}`, // Rastrear extras separadamente
        updatedAt: new Date(),
      })
      .where(eq(tenantCredits.tenantId, tenantIdNum))
      .returning();

    if (!updateResult || updateResult.length === 0) {
      throw new Error(`Update não retornou nenhum registro para tenant ${tenantIdNum}`);
    }

    const newCredits = updateResult[0]?.currentCredits || 0;
    const newTotalPurchased = updateResult[0]?.totalCreditsPurchased || 0;
    
    console.log(`[Extra Credits] ✅ Créditos atualizados!`);
    console.log(`[Extra Credits] 📊 Novo saldo: ${newCredits} (era ${oldCredits}, adicionou ${creditsToAdd})`);
    console.log(`[Extra Credits] 📊 Novo total comprado: ${newTotalPurchased} (era ${oldTotalPurchased}, adicionou ${creditsToAdd})`);
    
    // Verificar se a atualização funcionou corretamente
    if (Math.abs(newCredits - (oldCredits + creditsToAdd)) > 0.01) {
      console.error(`[Extra Credits] ⚠️ ATENÇÃO: Novo saldo (${newCredits}) não corresponde ao esperado (${oldCredits + creditsToAdd})`);
    }
    
    // Buscar novamente para confirmar
    const verifyCredits = await db
      .select()
      .from(tenantCredits)
      .where(eq(tenantCredits.tenantId, tenantIdNum))
      .limit(1);
    
    if (verifyCredits[0]) {
      console.log(`[Extra Credits] 🔍 Verificação: Saldo no banco após update: ${verifyCredits[0].currentCredits}`);
      if (verifyCredits[0].currentCredits !== newCredits) {
        console.error(`[Extra Credits] ❌ ERRO CRÍTICO: Saldo retornado (${newCredits}) diferente do saldo no banco (${verifyCredits[0].currentCredits})!`);
      }
    }
  } else {
    // Criar registro inicial
    console.log(`[Extra Credits] 🆕 Criando registro inicial de créditos para tenant ${tenantIdNum}...`);
    const insertResult = await db.insert(tenantCredits).values({
      tenantId: tenantIdNum,
      currentCredits: creditsToAdd,
      totalCreditsPurchased: creditsToAdd,
      extrasPurchased: creditsToAdd, // Todos são extras se não há registro
    }).returning();

    if (!insertResult || insertResult.length === 0) {
      throw new Error(`Insert não retornou nenhum registro para tenant ${tenantIdNum}`);
    }

    console.log(`[Extra Credits] ✅ Registro de créditos criado. Saldo inicial: ${insertResult[0]?.currentCredits || creditsToAdd}`);
  }

  // Criar log
  console.log(`[Extra Credits] 📝 Criando log de plataforma...`);
  await createPlatformLog({
    tenantId: tenantIdNum,
    eventType: "extra_credits_purchased",
    severity: "info",
    message: `${creditsToAdd} créditos extras comprados`,
    metadata: JSON.stringify({
      sessionId: session.id,
      creditsAmount: creditsToAdd,
      amountPaid: session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00',
      oldCredits: existingCredits[0]?.currentCredits || 0,
      newCredits: existingCredits[0] ? (existingCredits[0].currentCredits + creditsToAdd) : creditsToAdd,
    }),
  });
  
  console.log(`[Extra Credits] ✅✅✅ Processo completo finalizado com sucesso para tenant ${tenantIdNum}!`);
}
