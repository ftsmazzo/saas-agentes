import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "./_core/trpc";
import { configRouter } from "./routers/config";
import { plansRouter } from "./routers/plans";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { provisionTenant, deprovisionTenant, getTenantDatabaseCredentials } from "./tenant-provisioning";
import { cloneWorkflowForTenant, activateWorkflow, deactivateWorkflow, deleteWorkflow, getWorkflowExecutionStats, syncAgentConfigToN8N, isWorkflowPublished, updateModelInWorkflow } from "./n8n-integration";
import { createEvolutionInstance, generateQRCode, getConnectionStatus, deleteEvolutionInstance, logoutInstance } from "./evolution-integration";
import { getInboxConversations, getConversationMessages, getInboxStats, deleteChatwootInbox, deleteChatwootInboxByName, findChatwootInboxByName, deleteChatwootWebhookByUrl, createOrUpdateChatwootAgentBot, connectAgentBotToInbox, deleteChatwootAgentBotByName, disconnectAgentBotFromInbox, deleteChatwootAgentBot } from "./chatwoot-integration";
import { notifyOwner } from "./_core/notification";
import { activationTokens } from "../drizzle/schema";
import Stripe from 'stripe';
import axios from 'axios';
import { getTenantCredits } from "./credit-system";
import { usageTransactions, tenantCredits } from "../drizzle/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";

const stripeApiKey = process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
if (stripeApiKey === 'sk_test_dummy') {
  console.warn('[Stripe] Nenhuma chave encontrada. Usando chave dummy (modo dev sem Stripe).');
}
const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-11-17.clover',
});

// Importar adminProcedure do trpc (já tem verificação correta de ctx.user)
// Não redefinir aqui para evitar duplicação e bugs

// Função auxiliar para deletar um tenant completamente (N8N, Evolution, Chatwoot, Banco)
async function deleteTenantCompletely(tenant: db.Tenant): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Deletar workflow do N8N
  if (tenant.n8nWorkflowId) {
    try {
      await deleteWorkflow(tenant.n8nWorkflowId);
      console.log(`[Delete] ✅ Workflow N8N ${tenant.n8nWorkflowId} deletado`);
    } catch (error: any) {
      const errorMsg = `N8N: ${error.message}`;
      console.error(`[Delete] ❌ Erro ao deletar workflow N8N:`, errorMsg);
      errors.push(errorMsg);
    }
  }

  // 2. Deletar instância Evolution
  if (tenant.evolutionInstanceName) {
    try {
      await deleteEvolutionInstance(tenant.evolutionInstanceName);
      console.log(`[Delete] ✅ Instância Evolution ${tenant.evolutionInstanceName} deletada`);
    } catch (error: any) {
      const errorMsg = `Evolution: ${error.message}`;
      console.error(`[Delete] ❌ Erro ao deletar Evolution:`, errorMsg);
      errors.push(errorMsg);
    }
  }

  // 3. Deletar inbox do Chatwoot
  if (tenant.chatwootInboxId) {
    try {
      await deleteChatwootInbox(tenant.chatwootInboxId);
      console.log(`[Delete] ✅ Inbox Chatwoot ${tenant.chatwootInboxId} deletado`);
    } catch (error: any) {
      const errorMsg = `Chatwoot: ${error.message}`;
      console.error(`[Delete] ❌ Erro ao deletar Chatwoot:`, errorMsg);
      errors.push(errorMsg);
    }
  } else {
    // Se não temos o ID salvo, tentar buscar e deletar pelo nome
    // Tentar múltiplas variações do nome (Evolution pode criar com nome diferente)
    const possibleNames = [
      tenant.companyName,
      `Tenant ${tenant.id}`,
      `${tenant.companyName} - WhatsApp`,
      `Tenant ${tenant.id} - WhatsApp`,
    ].filter(Boolean); // Remove valores undefined/null
    
    let deleted = false;
    for (const inboxName of possibleNames) {
      if (!inboxName) continue;
      
      try {
        deleted = await deleteChatwootInboxByName(inboxName);
        if (deleted) {
          console.log(`[Delete] ✅ Inbox Chatwoot "${inboxName}" deletado (encontrado pelo nome)`);
          break; // Se encontrou e deletou, não precisa tentar outros nomes
        }
      } catch (error: any) {
        console.warn(`[Delete] ⚠️ Erro ao tentar deletar inbox "${inboxName}":`, error.message);
        // Continuar tentando outros nomes
      }
    }
    
    if (!deleted) {
      console.log(`[Delete] ⚠️ Inbox Chatwoot não encontrado com nenhum dos nomes: ${possibleNames.join(', ')} (pode já ter sido deletado)`);
    }
  }

  // 3.5. Desconectar Agent Bot do inbox (se houver)
  if (tenant.chatwootInboxId) {
    try {
      await disconnectAgentBotFromInbox(tenant.chatwootInboxId);
      console.log(`[Delete] ✅ Agent Bot desconectado do inbox ${tenant.chatwootInboxId}`);
    } catch (error: any) {
      console.warn(`[Delete] ⚠️ Erro ao desconectar Agent Bot (não crítico):`, error.message);
    }
  }

  // 3.6. Deletar Agent Bot do Chatwoot
  const botName = `Agente ${tenant.companyName || `Tenant ${tenant.id}`}`;
  try {
    const deleted = await deleteChatwootAgentBotByName(botName);
    if (deleted) {
      console.log(`[Delete] ✅ Agent Bot "${botName}" deletado`);
    } else {
      console.log(`[Delete] ⚠️ Agent Bot "${botName}" não encontrado (pode já ter sido deletado)`);
    }
  } catch (error: any) {
    console.warn(`[Delete] ⚠️ Erro ao deletar Agent Bot (não crítico):`, error.message);
  }

  // 3.7. Deletar webhook do Chatwoot criado pelo N8N
  const n8nApiUrl = process.env.N8N_API_URL;
  if (n8nApiUrl) {
    const tenantWebhookUrl = `${n8nApiUrl}/webhook/tenant_${tenant.id}`;
    try {
      const deleted = await deleteChatwootWebhookByUrl(tenantWebhookUrl);
      if (deleted) {
        console.log(`[Delete] ✅ Webhook Chatwoot "${tenantWebhookUrl}" deletado`);
      } else {
        console.log(`[Delete] ⚠️ Webhook Chatwoot "${tenantWebhookUrl}" não encontrado (pode já ter sido deletado ou não foi criado)`);
      }
    } catch (error: any) {
      const errorMsg = `Chatwoot Webhook: ${error.message}`;
      console.error(`[Delete] ❌ Erro ao deletar webhook Chatwoot:`, errorMsg);
      // Não adicionar como erro crítico, apenas logar
    }
  }

  // 4. Deletar do banco de dados (SEMPRE, mesmo se recursos externos falharem)
  try {
    await db.deleteTenant(tenant.id);
    console.log(`[Delete] ✅ Tenant ${tenant.id} deletado do banco de dados`);
  } catch (error: any) {
    const errorMsg = `Banco: ${error.message}`;
    console.error(`[Delete] ❌ Erro ao deletar do banco:`, errorMsg);
    errors.push(errorMsg);
    throw error; // Se falhar no banco, lançar erro
  }

  return { success: errors.length === 0, errors };
}

export const appRouter = router({
  system: systemRouter,
  config: configRouter,
  plans: plansRouter,
  
  auth: router({
    me: publicProcedure.query(opts => {
      // Retornar user (admin) ou tenant (cliente)
      if (opts.ctx.user) {
        return { type: 'admin' as const, user: opts.ctx.user };
      }
      if (opts.ctx.tenant) {
        return { type: 'client' as const, tenant: opts.ctx.tenant };
      }
      return { type: null, user: null, tenant: null };
    }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // Login de admin (email + senha)
    adminLogin: publicProcedure
      .input(z.object({
        email: z.string().trim().toLowerCase().email({
          message: "Email inválido. Por favor, verifique o formato do email.",
        }),
        password: z.string().min(1, {
          message: "Senha é obrigatória",
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const { loginAdmin, createAuthToken } = await import('./_core/auth');
        
        const result = await loginAdmin(input.email, input.password);
        
        if (!result.success || !result.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: result.error || 'Email ou senha inválidos',
          });
        }
        
        // Criar sessão JWT
        const sessionToken = await createAuthToken({
          type: 'admin',
          userId: result.user.id,
          email: result.user.email || '',
          name: result.user.name || 'Admin',
        });
        
        // Definir cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        
        return {
          success: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
        };
      }),
    
    // Login de cliente (email + senha)
    clientLogin: publicProcedure
      .input(z.object({
        email: z.string().trim().toLowerCase().email({
          message: "Email inválido. Por favor, verifique o formato do email.",
        }),
        password: z.string().min(1, {
          message: "Senha é obrigatória",
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const { loginClient, createAuthToken } = await import('./_core/auth');
        
        const result = await loginClient(input.email, input.password);
        
        if (!result.success || !result.tenant) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: result.error || 'Email ou senha inválidos',
          });
        }
        
        // Criar sessão JWT
        const sessionToken = await createAuthToken({
          type: 'client',
          tenantId: result.tenant.id,
          email: result.tenant.email,
          name: result.tenant.companyName,
        });
        
        // Definir cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        
        return {
          success: true,
          tenant: {
            id: result.tenant.id,
            email: result.tenant.email,
            companyName: result.tenant.companyName,
          },
        };
      }),
    
    // Validar token de ativação
    validateActivationToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenData = await db.getActivationToken(input.token);
        
        if (!tokenData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Token inválido ou expirado' });
        }
        
        if (new Date() > tokenData.expiresAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expirado' });
        }
        
        const tenant = await db.getTenantById(tokenData.tenantId);
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }
        
        return {
          email: tenant.email,
          companyName: tenant.companyName,
        };
      }),
    
    // Ativar conta
    activateAccount: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const tokenData = await db.getActivationToken(input.token);
        
        if (!tokenData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Token inválido ou expirado' });
        }
        
        if (new Date() > tokenData.expiresAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expirado' });
        }
        
        // Ativar tenant e definir senha
        await db.activateTenant(tokenData.tenantId, input.password);
        
        // Invalidar token
        await db.deleteActivationToken(input.token);
        
        await db.createPlatformLog({
          tenantId: tokenData.tenantId,
          eventType: 'tenant_activated',
          severity: 'info',
          message: 'Conta ativada com sucesso',
        });
        
        return { success: true };
      }),
    
    // Atualizar perfil do admin
    updateProfile: adminProcedure
      .input(z.object({
        name: z.string().min(1, { message: "Nome é obrigatório" }),
        email: z.string().email({ message: "Email inválido" }),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' });
        }
        
        // Verificar se email já está em uso por outro usuário
        const existingUser = await db.getUserByEmail(input.email.trim().toLowerCase());
        if (existingUser && existingUser.id !== ctx.user.id) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Este email já está em uso por outro usuário' 
          });
        }
        
        await db.updateUser(ctx.user.id, {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
        });
        
        return { success: true };
      }),
    
    // Alterar senha do admin
    changePassword: adminProcedure
      .input(z.object({
        currentPassword: z.string().min(1, { message: "Senha atual é obrigatória" }),
        newPassword: z.string().min(8, { message: "Nova senha deve ter pelo menos 8 caracteres" }),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' });
        }
        
        // Buscar usuário atual
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Usuário não encontrado ou senha não definida' 
          });
        }
        
        // Verificar senha atual
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        
        if (!isValid) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Senha atual incorreta' 
          });
        }
        
        // Gerar hash da nova senha
        const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
        
        // Atualizar senha
        await db.updateUser(ctx.user.id, {
          passwordHash: newPasswordHash,
        });
        
        return { success: true };
      }),
  }),

  // ========== SISTEMA DE TESTE SIMULADO ==========
  
  test: router({
    // Simular pagamento e criar tenant (SEM STRIPE)
    simulatePayment: publicProcedure
      .input(z.object({
        email: z.string().email(),
        companyName: z.string().min(1),
        planId: z.number(),
      }))
      .mutation(async ({ input }) => {
        console.log('🧪 [TEST MODE] Simulando pagamento para:', input.email);
        
        // Importar a função de provisionamento do webhook
        const { provisionTenantFromCheckout } = await import('./webhooks/stripe');
        
        // Criar um objeto simulado de checkout session
        const mockSession = {
          id: `cs_test_${Date.now()}`,
          customer_email: input.email,
          metadata: {
            companyName: input.companyName,
            planId: input.planId.toString(),
          },
          customer: 'test_customer',
          subscription: 'test_subscription',
        } as any;
        
        // Provisionar tenant usando a mesma lógica do webhook
        await provisionTenantFromCheckout(mockSession);
        
        console.log('✅ [TEST MODE] Tenant criado com sucesso!');
        
        return { 
          success: true, 
          message: 'Tenant criado em modo teste! Verifique seu email para ativar a conta.' 
        };
      }),
  }),
  
  // ========== ROTAS DE GERENCIAMENTO DE TENANTS (ADMIN) ==========
  
  tenants: router({
    // Listar todos os tenants
    list: adminProcedure.query(async () => {
      const tenants = await db.getAllTenants();
      return tenants;
    }),

    // Buscar tenant por ID
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const tenant = await db.getTenantById(input.id);
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }
        return tenant;
      }),

    // Criar novo tenant com provisionamento completo
    create: adminProcedure
      .input(z.object({
        companyName: z.string().min(1),
        email: z.string().email(),
        subdomain: z.string().optional(),
        planId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          console.log('\n\n========================================');
          console.log('🚀 [CREATE TENANT] Iniciando cria\u00e7\u00e3o de tenant:', input.companyName);
          console.log('========================================\n');
          
          // 1. Criar tenant no banco de dados primeiro
          console.log('📝 [STEP 1] Criando log inicial...');
          await db.createPlatformLog({
            eventType: 'tenant_created',
            severity: 'info',
            message: `Iniciando provisionamento para ${input.companyName}`,
          });

          console.log('📝 [STEP 2] Criando tenant no banco...');
          // IMPORTANTE: Criar como não ativado (isActivated: false)
          // O status pode ser 'active' mas isActivated deve ser false até o cliente ativar
          const tenant = await db.createTenant({
            ownerId: ctx.user.id,
            companyName: input.companyName,
            email: input.email,
            subdomain: input.subdomain || undefined,
            status: 'active' as const,
            isActivated: false, // Cliente ainda não ativou a conta
            currentPlanId: input.planId,
          });

          console.log('✅ [STEP 2] Tenant criado com ID:', tenant.id);
          console.log('✅ [STEP 2] Tenant criado como não ativado (isActivated: false)');
          
          // 2. Provisionar recursos do tenant (modelo multi-tenant compartilhado)
          console.log('🔧 [STEP 3] Provisionando recursos do tenant...');
          const provisionResult = await provisionTenant({
            tenantId: tenant.id,
            companyName: input.companyName,
          });

          if (!provisionResult.success) {
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'db_failed',
              severity: 'error',
              message: `Falha ao provisionar recursos: ${provisionResult.error}`,
            });
            
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Falha ao provisionar recursos: ${provisionResult.error}`,
            });
          }

          await db.createPlatformLog({
            tenantId: tenant.id,
            eventType: 'db_provisioned',
            severity: 'info',
            message: `Recursos provisionados para tenant ${tenant.id}`,
          });
          
          console.log('✅ [STEP 3] Recursos provisionados com sucesso!');
          
          // 3. Provisionar inst\u00e2ncia Evolution API
          console.log('🔧 [STEP 4] Criando inst\u00e2ncia Evolution API...');
          let evolutionInstanceName = '';
          let evolutionApiKey = '';
          
          try {
            const evolutionResult = await createEvolutionInstance(tenant.id, input.companyName);
            console.log('✅ [STEP 4] Evolution criada:', evolutionResult.instanceName);
            evolutionInstanceName = evolutionResult.instanceName;
            evolutionApiKey = evolutionResult.apiKey;
            
            // Buscar inboxId criado pelo Evolution (pode levar alguns segundos para aparecer)
            let chatwootInboxId: number | null = null;
            try {
              // Aguardar um pouco para o Evolution criar o inbox
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Tentar buscar pelo nome (Evolution usa o nome que passamos)
              chatwootInboxId = await findChatwootInboxByName(input.companyName);
              
              if (chatwootInboxId) {
                console.log(`[Chatwoot] ✅ Inbox encontrado: ${chatwootInboxId}`);
              } else {
                console.log(`[Chatwoot] ⚠️ Inbox não encontrado imediatamente (pode ser criado depois)`);
              }
            } catch (error: any) {
              console.warn(`[Chatwoot] ⚠️ Erro ao buscar inbox (não crítico):`, error.message);
            }
            
            await db.updateTenant(tenant.id, {
              evolutionInstanceName,
              evolutionApiKey,
              chatwootInboxId: chatwootInboxId || undefined,
            });
            
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'evolution_provisioned',
              severity: 'info',
              message: `Instância Evolution criada: ${evolutionInstanceName}`,
            });
          } catch (error: any) {
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'evolution_failed',
              severity: 'error',
              message: `Falha ao criar instância Evolution: ${error.message}`,
            });
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Erro ao provisionar Evolution API: ${error.message}`,
            });
          }
          
          // 4. Clonar workflow N8N
          console.log('🔧 [STEP 5] Clonando workflow N8N...');
          try {
            const workflowResult = await cloneWorkflowForTenant(
              tenant.id,
              input.companyName,
              evolutionInstanceName
            );
            
            await db.updateTenant(tenant.id, {
              n8nWorkflowId: workflowResult.workflowId,
            });
            
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'workflow_provisioned',
              severity: 'info',
              message: `Workflow N8N clonado: ${workflowResult.workflowId}`,
            });
          } catch (error: any) {
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'workflow_failed',
              severity: 'error',
              message: `Falha ao clonar workflow: ${error.message}`,
            });
            console.log('⚠️ [STEP 5] Erro ao clonar workflow:', error.message);
            // Não lançar erro aqui - tenant já foi criado
          }
          
          console.log('✅ [STEP 5] Workflow N8N clonado!');
          
          // 6. Criar configura\u00e7\u00e3o padr\u00e3o do agente
          console.log('🔧 [STEP 6] Criando configura\u00e7\u00e3o do agente...');
          await db.createAgentConfig({
            tenantId: tenant.id,
            systemPrompt: 'Você é um assistente virtual prestativo e profissional.',
            companyInfo: JSON.stringify({ name: input.companyName }),
            welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
          });
          console.log('✅ [STEP 6] Configura\u00e7\u00e3o criada!');
          
          // 7. Gerar token de ativação e enviar email
          console.log('📧 [STEP 7] Gerando token de ativação e enviando email...');
          try {
            const crypto = await import('crypto');
            const activationToken = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
            
            const dbInstance = await db.getDb();
            if (!dbInstance) throw new Error("Database not available");
            
            await dbInstance.insert(activationTokens).values({
              tenantId: tenant.id,
              token: activationToken,
              expiresAt,
            });
            
            console.log(`[Admin Create] Activation token created: ${activationToken}`);
            
            // Enviar email de ativação
            const { sendActivationEmail } = await import('./email');
            await sendActivationEmail(input.email, activationToken, input.companyName);
            console.log(`[Admin Create] Activation email sent to ${input.email}`);
            
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'tenant_created',
              severity: 'info',
              message: `Tenant criado e email de ativação enviado para ${input.email}`,
              metadata: JSON.stringify({ email: input.email, planId: input.planId }),
            });
          } catch (error: any) {
            console.error(`[Admin Create] ❌ Erro ao gerar token/enviar email:`, error);
            await db.createPlatformLog({
              tenantId: tenant.id,
              eventType: 'email_failed',
              severity: 'error',
              message: `Falha ao enviar email de ativação: ${error.message}`,
              metadata: JSON.stringify({ error: error.message }),
            });
            // Não lançar erro - email é importante mas não bloqueia criação
          }
          
          // 8. Notificar o proprietário (opcional - não bloqueia criação)
          console.log('📧 [STEP 8] Notificando proprietário...');
          try {
            await notifyOwner({
              title: 'Novo Cliente Cadastrado',
              content: `Um novo cliente foi cadastrado: ${input.companyName} (${input.email})`,
            });
            console.log('✅ [STEP 8] Notificação enviada!');
          } catch (error: any) {
            console.warn('⚠️ [STEP 8] Erro ao notificar (não bloqueia criação):', error.message);
            // Não lançar erro - notificação é opcional
          }

          console.log('\n🎉 [SUCCESS] Tenant criado com sucesso!');
          console.log('========================================\n\n');
          
          return { success: true, tenant };
          
        } catch (error: any) {
          await db.createPlatformLog({
            eventType: 'tenant_created',
            severity: 'error',
            message: `Erro ao criar tenant: ${error.message}`,
          });
          
          throw error;
        }
      }),

    // Suspender tenant
    suspend: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const tenant = await db.getTenantById(input.id);
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        // Desativar workflow
        if (tenant.n8nWorkflowId) {
          await deactivateWorkflow(tenant.n8nWorkflowId);
        }

        await db.updateTenant(input.id, { status: 'suspended' });
        
        await db.createPlatformLog({
          tenantId: input.id,
          eventType: 'tenant_suspended',
          severity: 'warning',
          message: `Tenant ${tenant.companyName} foi suspenso`,
        });

        return { success: true };
      }),

    // Reativar tenant
    reactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const tenant = await db.getTenantById(input.id);
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        // Reativar workflow
        if (tenant.n8nWorkflowId) {
          await activateWorkflow(tenant.n8nWorkflowId);
        }

        await db.updateTenant(input.id, { status: 'active' });
        
        return { success: true };
      }),


    // Deletar tenant (hard delete - remove completamente)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const tenant = await db.getTenantById(input.id);
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        const companyName = tenant.companyName;
        
        // Usar função auxiliar para deletar completamente
        const result = await deleteTenantCompletely(tenant);
        
        // Log de sucesso (mesmo que alguns recursos externos tenham falhado)
        await db.createPlatformLog({
          tenantId: input.id,
          eventType: 'tenant_deleted',
          severity: result.errors.length > 0 ? 'warning' : 'info',
          message: `Tenant ${companyName} foi deletado${result.errors.length > 0 ? `. Avisos: ${result.errors.join(', ')}` : ''}`,
          metadata: JSON.stringify({ errors: result.errors }),
        });

        return { 
          success: true,
          message: result.errors.length > 0 
            ? `Tenant deletado, mas alguns recursos podem não ter sido removidos: ${result.errors.join(', ')}`
            : 'Tenant deletado com sucesso',
          errors: result.errors.length > 0 ? result.errors : undefined,
        };
      }),

    // Limpar todos os clientes de teste
    deleteAllTestClients: adminProcedure.mutation(async () => {
      const allTenants = await db.getAllTenants();
      
      // Filtrar clientes de teste (geralmente têm email de teste ou nome específico)
      const testTenants = allTenants.filter(tenant => {
        const email = tenant.email.toLowerCase();
        const companyName = tenant.companyName.toLowerCase();
        
        // Critérios para identificar clientes de teste
        return (
          email.includes('test') ||
          email.includes('teste') ||
          email.includes('demo') ||
          companyName.includes('test') ||
          companyName.includes('teste') ||
          companyName.includes('demo') ||
          email.includes('@example.com') ||
          email.includes('@test.com')
        );
      });

      if (testTenants.length === 0) {
        return { 
          success: true, 
          message: 'Nenhum cliente de teste encontrado',
          deleted: 0 
        };
      }

      const results = {
        deleted: 0,
        errors: [] as string[],
      };

      for (const tenant of testTenants) {
        try {
          const result = await deleteTenantCompletely(tenant);
          results.deleted++;
          if (result.errors.length > 0) {
            results.errors.push(...result.errors.map(e => `${tenant.companyName}: ${e}`));
          }
          console.log(`[DeleteAll] ✅ Tenant ${tenant.id} (${tenant.companyName}) deletado`);
        } catch (error: any) {
          const errorMsg = `Erro ao deletar tenant ${tenant.id} (${tenant.companyName}): ${error.message}`;
          console.error(`[DeleteAll] ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      await db.createPlatformLog({
        tenantId: 0, // Log global
        eventType: 'bulk_delete_test_clients',
        severity: results.errors.length > 0 ? 'warning' : 'info',
        message: `${results.deleted} clientes de teste deletados${results.errors.length > 0 ? `. ${results.errors.length} erros.` : ''}`,
        metadata: JSON.stringify({ deleted: results.deleted, errors: results.errors }),
      });

      return {
        success: true,
        message: `${results.deleted} cliente(s) de teste deletado(s)${results.errors.length > 0 ? `. ${results.errors.length} erro(s).` : ''}`,
        deleted: results.deleted,
        errors: results.errors.length > 0 ? results.errors : undefined,
      };
    }),

    // Deletar TODOS os clientes (CUIDADO!)
    deleteAllClients: adminProcedure.mutation(async () => {
      const allTenants = await db.getAllTenants();

      if (allTenants.length === 0) {
        return { 
          success: true, 
          message: 'Nenhum cliente encontrado',
          deleted: 0 
        };
      }

      const results = {
        deleted: 0,
        errors: [] as string[],
      };

      for (const tenant of allTenants) {
        try {
          const result = await deleteTenantCompletely(tenant);
          results.deleted++;
          if (result.errors.length > 0) {
            results.errors.push(...result.errors.map(e => `${tenant.companyName}: ${e}`));
          }
          console.log(`[DeleteAll] ✅ Tenant ${tenant.id} (${tenant.companyName}) deletado`);
        } catch (error: any) {
          const errorMsg = `Erro ao deletar tenant ${tenant.id} (${tenant.companyName}): ${error.message}`;
          console.error(`[DeleteAll] ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      await db.createPlatformLog({
        tenantId: 0, // Log global
        eventType: 'bulk_delete_all_clients',
        severity: results.errors.length > 0 ? 'warning' : 'info',
        message: `${results.deleted} clientes deletados${results.errors.length > 0 ? `. ${results.errors.length} erros.` : ''}`,
        metadata: JSON.stringify({ deleted: results.deleted, errors: results.errors }),
      });

      return {
        success: true,
        message: `${results.deleted} cliente(s) deletado(s)${results.errors.length > 0 ? `. ${results.errors.length} erro(s).` : ''}`,
        deleted: results.deleted,
        errors: results.errors.length > 0 ? results.errors : undefined,
      };
    }),

    // Atualizar subdomínio
    updateSubdomain: adminProcedure
      .input(z.object({
        id: z.number(),
        subdomain: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await db.updateTenant(input.id, { subdomain: input.subdomain });
        return { success: true };
      }),
  }),

  // ========== ROTAS DE PLANOS (LEGACY - MOVED TO plans router) ==========
  
  plansLegacy: router({
    list: publicProcedure.query(async () => {
      return await db.getAllPlans();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPlanById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        stripePriceId: z.string(),
        priceMonthly: z.number(),
        maxWorkflowExecutions: z.number().optional(),
        maxConversations: z.number().optional(),
        maxStorageGB: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPlan(input);
      }),
  }),

  // ========== ROTAS DE CONFIGURAÇÃO DO AGENTE (CLIENTE) ==========
  
  agent: router({
    // Criar novo agente
    createAgent: protectedProcedure
      .input(z.object({
        agentName: z.string().min(1, "Nome do agente é obrigatório"),
        systemPrompt: z.string().min(50, "Prompt deve ter no mínimo 50 caracteres"),
        welcomeMessage: z.string().optional(),
        companyInfo: z.string().optional(),
        enableHumanHandoff: z.boolean().default(true),
        enableAudioTranscription: z.boolean().default(true),
        enableImageProcessing: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        // Se for cliente, usar tenant direto
        let tenant = ctx.tenant;
        
        // Se for admin, buscar tenant pelo ownerId (compatibilidade)
        if (!tenant && ctx.user) {
          tenant = await db.getTenantByUserId(ctx.user.id);
        }
        
        if (!tenant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cliente não encontrado',
          });
        }

        // Validar limite de agentes do plano
        const { validateAgentCreation } = await import("./plan-validation");
        const agentValidation = await validateAgentCreation(tenant.id);
        if (!agentValidation.allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: agentValidation.reason || 'Limite de agentes atingido',
          });
        }

        // Verificar se já existe configuração
        const existingConfig = await db.getAgentConfig(tenant.id);
        if (existingConfig) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Agente já existe. Use a opção de editar para modificar.',
          });
        }

        // Criar configuração do agente
        await db.createAgentConfig({
          tenantId: tenant.id,
          systemPrompt: input.systemPrompt,
          welcomeMessage: input.welcomeMessage || "Olá! Como posso ajudá-lo hoje?",
          companyInfo: input.companyInfo || null,
          enableHumanHandoff: input.enableHumanHandoff,
          enableAudioTranscription: input.enableAudioTranscription,
          enableImageProcessing: input.enableImageProcessing,
        });

        await db.createPlatformLog({
          tenantId: tenant.id,
          eventType: 'config_updated',
          severity: 'info',
          message: `Agente "${input.agentName}" criado com sucesso`,
        });

        return { success: true, message: "Agente criado com sucesso!" };
      }),

    // Buscar configuração do agente
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      // Se for cliente, usar tenant direto
      if (ctx.tenant) {
        const config = await db.getAgentConfig(ctx.tenant.id);
        return config;
      }
      
      // Se for admin, buscar tenant pelo ownerId (compatibilidade)
      if (ctx.user) {
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
        
        if (!userTenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        const config = await db.getAgentConfig(userTenant.id);
        return config;
      }

      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' });
    }),

    // Atualizar configuração do agente
    updateConfig: protectedProcedure
      .input(z.object({
        systemPrompt: z.string().optional(),
        companyInfo: z.string().optional(),
        welcomeMessage: z.string().optional(),
        enableHumanHandoff: z.boolean().optional(),
        enableAudioTranscription: z.boolean().optional(),
        enableImageProcessing: z.boolean().optional(),
        openaiModel: z.string().optional(), // Modelo OpenAI: 'gpt-4o', 'gpt-4o-mini', etc.
        toolsConfig: z.string().optional(), // JSON string
        schedulingConfig: z.string().optional(), // JSON string
        ragConfig: z.string().optional(), // JSON string
      }))
      .mutation(async ({ input, ctx }) => {
        let tenantId: number | null = null;
        let tenant: db.Tenant | null = null;
        
        // Se for cliente, usar tenant direto
        if (ctx.tenant) {
          tenant = ctx.tenant;
          tenantId = ctx.tenant.id;
        } else if (ctx.user) {
          // Se for admin, buscar tenant pelo ownerId (compatibilidade)
          const tenants = await db.getAllTenants();
          const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
          
          if (!userTenant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
          }

          tenant = userTenant;
          tenantId = userTenant.id;
        } else {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' });
        }

        // Validar modelo se fornecido
        if (input.openaiModel && tenantId) {
          const { validateModelForTenant } = await import("./plan-validation");
          const validation = await validateModelForTenant(tenantId, input.openaiModel);
          if (!validation.allowed) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: validation.reason || 'Modelo não permitido para seu plano',
            });
          }
        }

        // Validar features se fornecidas
        if (input.ragConfig && tenantId) {
          const { validateFeatureForTenant } = await import("./plan-validation");
          const validation = await validateFeatureForTenant(tenantId, 'enableRAG');
          if (!validation.allowed) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: validation.reason || 'RAG não está disponível no seu plano',
            });
          }
        }

        if (input.schedulingConfig && tenantId) {
          const { validateFeatureForTenant } = await import("./plan-validation");
          const validation = await validateFeatureForTenant(tenantId, 'enableScheduling');
          if (!validation.allowed) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: validation.reason || 'Agendamento não está disponível no seu plano',
            });
          }
        }
        
        await db.updateAgentConfig(tenantId, input);

        // Sincronizar configuração com N8N em background (não bloqueia)
        if (tenantId) {
          try {
            const tenant = await db.getTenantById(tenantId);
            if (tenant?.n8nWorkflowId) {
              // Se o modelo foi alterado, atualizar diretamente no workflow
              if (input.openaiModel) {
                await updateModelInWorkflow(tenant.n8nWorkflowId, input.openaiModel);
              }
              
              // Sincronizar outras configurações
              await syncAgentConfigToN8N(tenant.n8nWorkflowId, tenantId, input);
            }
          } catch (error: any) {
            console.warn(`[AgentConfig] Erro ao sincronizar com N8N (não bloqueia):`, error.message);
          }
        }

        return { success: true };
      }),
  }),

  // ========== ROTAS DE MÉTRICAS E CONSUMO ==========
  
  metrics: router({
    // Métricas do tenant (para admin)
    getTenantMetrics: adminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        const currentMonth = await db.getCurrentMonthUsage(input.tenantId);
        const tenant = await db.getTenantById(input.tenantId);
        
        let workflowStats = null;
        if (tenant?.n8nWorkflowId) {
          workflowStats = await getWorkflowExecutionStats(tenant.n8nWorkflowId);
        }

        return {
          currentMonth,
          workflowStats,
        };
      }),

    // Métricas simplificadas do próprio tenant (para cliente) - otimizado
    getMyMetrics: protectedProcedure.query(async ({ ctx }) => {
      let tenantId: number | null = null;
      
      // Se for cliente, usar tenant direto
      if (ctx.tenant) {
        tenantId = ctx.tenant.id;
      } else if (ctx.user) {
        // Se for admin, buscar tenant pelo ownerId (compatibilidade)
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
        if (userTenant) {
          tenantId = userTenant.id;
        }
      }
      
      if (!tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      }

      // Buscar apenas contagens otimizadas (sem workflow stats que é lento)
      const stats = await db.getTenantConversationStats(tenantId);

      return {
        totalConversations: stats.totalConversations,
        totalMessages: stats.totalMessages,
      };
    }),

    // ========== SISTEMA DE CRÉDITOS ==========

    // Obter créditos estimados por modelo (para exibição no seletor)
    getModelCredits: publicProcedure
      .input(z.object({ 
        model: z.string(),
        exampleTokensInput: z.number().optional().default(1500),
        exampleTokensOutput: z.number().optional().default(2000),
      }))
      .query(async ({ input }) => {
        const { estimateCreditsForModel } = await import("./credit-system");
        const credits = await estimateCreditsForModel(
          input.model,
          input.exampleTokensInput,
          input.exampleTokensOutput
        );
        return { model: input.model, credits };
      }),

    // Obter créditos estimados para todos os modelos
    getAllModelsCredits: publicProcedure.query(async () => {
      const { estimateCreditsForModel } = await import("./credit-system");
      const models = [
        "gpt-4o",
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-4o-mini",
        "gpt-5",
        "gpt-5-mini",
        "gpt-5.2",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
      ];
      
      const credits = await Promise.all(
        models.map(async (model) => ({
          model,
          credits: await estimateCreditsForModel(model, 1500, 2000),
        }))
      );
      
      return credits;
    }),

    // Obter modelos permitidos para o plano do usuário
    getAllowedModels: protectedProcedure.query(async ({ ctx }) => {
      let tenantId: number | null = null;
      
      if (ctx.tenant) {
        tenantId = ctx.tenant.id;
      } else if (ctx.user) {
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
        if (userTenant) {
          tenantId = userTenant.id;
        }
      }

      if (!tenantId) {
        // Se não tiver tenant, retorna apenas modelos básicos
        const { getAllowedModelsForPlan } = await import("./plan-validation");
        return getAllowedModelsForPlan(1);
      }

      const tenant = await db.getTenantById(tenantId);
      const planId = tenant?.currentPlanId || 1;
      
      const { getAllowedModelsForPlan } = await import("./plan-validation");
      return getAllowedModelsForPlan(planId);
    }),

    // Obter saldo de créditos (cliente)
    getMyCredits: protectedProcedure.query(async ({ ctx }) => {
      let tenantId: number | null = null;
      
      // Se for cliente, usar tenant direto
      if (ctx.tenant) {
        tenantId = ctx.tenant.id;
      } else if (ctx.user) {
        // Se for admin, buscar tenant pelo ownerId (compatibilidade)
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
        if (userTenant) {
          tenantId = userTenant.id;
        }
      }
      
      if (!tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      }

      const credits = await getTenantCredits(tenantId);
      const tenant = await db.getTenantById(tenantId);
      const plan = tenant?.currentPlanId ? await db.getPlanById(tenant.currentPlanId) : null;

      return {
        currentCredits: credits.currentCredits || 0,
        totalCreditsPurchased: credits.totalCreditsPurchased || 0,
        totalCreditsUsed: credits.totalCreditsUsed || 0,
        totalCreditsBonus: credits.totalCreditsBonus || 0,
        monthlyCredits: plan?.monthlyCredits || 0,
        lastResetDate: credits.lastResetDate,
      };
    }),

    // Comprar créditos extras
    purchaseExtraCredits: protectedProcedure
      .input(z.object({
        creditsAmount: z.number().int().min(1000, "Mínimo de 1.000 créditos").max(100000, "Máximo de 100.000 créditos"),
      }))
      .mutation(async ({ input, ctx }) => {
        let tenantId: number | null = null;
        let tenant: db.Tenant | null = null;
        
        // Se for cliente, usar tenant direto
        if (ctx.tenant) {
          tenant = ctx.tenant;
          tenantId = ctx.tenant.id;
        } else if (ctx.user) {
          // Se for admin, buscar tenant pelo ownerId (compatibilidade)
          const tenants = await db.getAllTenants();
          const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
          if (userTenant) {
            tenant = userTenant;
            tenantId = userTenant.id;
          }
        }
        
        if (!tenant || !tenantId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        // Buscar preço de créditos extras
        const { getCreditConfig } = await import("./credit-system");
        const pricePer1000Str = await getCreditConfig('extraCreditsPricePer1000');
        // Preço padrão: R$ 0,10 por 1.000 créditos (mais caro que créditos do plano)
        // Isso garante mínimo de R$ 0,50 para 5.000 créditos (mínimo do Stripe)
        const pricePer1000 = pricePer1000Str ? parseFloat(pricePer1000Str) : 0.10;
        
        // Calcular preço total (em centavos)
        const priceInReais = (input.creditsAmount / 1000) * pricePer1000;
        const priceInCents = Math.max(Math.round(priceInReais * 100), 50); // Mínimo R$ 0,50 (50 centavos)

        // Criar checkout session no Stripe
        try {
        const session = await stripe.checkout.sessions.create({
          // Se já tem customer no Stripe, usa customer. Senão, usa customer_email
          ...(tenant.stripeCustomerId 
            ? { customer: tenant.stripeCustomerId }
            : { customer_email: tenant.email }
          ),
          payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'brl',
                  product_data: {
                    name: `${input.creditsAmount.toLocaleString('pt-BR')} Créditos Extras`,
                    description: `Compra de ${input.creditsAmount.toLocaleString('pt-BR')} créditos extras para uso imediato`,
                  },
                  unit_amount: priceInCents,
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/subscription?success=true`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/subscription?canceled=true`,
            metadata: {
              tenantId: tenantId.toString(),
              type: 'extra_credits',
              creditsAmount: input.creditsAmount.toString(),
            },
          });

          // Criar log
          await db.createPlatformLog({
            tenantId: tenantId,
            eventType: 'payment_initiated',
            severity: 'info',
            message: `Checkout criado para compra de ${input.creditsAmount} créditos extras`,
            metadata: JSON.stringify({
              sessionId: session.id,
              creditsAmount: input.creditsAmount,
              priceInReais,
            }),
          });

          return {
            sessionId: session.id,
            url: session.url,
            creditsAmount: input.creditsAmount,
            priceInReais,
          };
        } catch (error: any) {
          console.error('[Stripe] Erro ao criar checkout para créditos extras:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao criar checkout: ${error.message}`,
          });
        }
      }),

    // Obter saldo de créditos de um tenant (admin)
    getTenantCredits: adminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        const credits = await getTenantCredits(input.tenantId);
        const tenant = await db.getTenantById(input.tenantId);
        const plan = tenant?.currentPlanId ? await db.getPlanById(tenant.currentPlanId) : null;

        return {
          currentCredits: credits.currentCredits,
          totalCreditsPurchased: credits.totalCreditsPurchased,
          totalCreditsUsed: credits.totalCreditsUsed,
          totalCreditsBonus: credits.totalCreditsBonus,
          monthlyCredits: plan?.monthlyCredits || 0,
          lastResetDate: credits.lastResetDate,
        };
      }),

    // Obter transações de uso (cliente - mostra créditos)
    getMyUsageTransactions: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        operation: z.enum(['chat', 'audio', 'image', 'format', 'pdf']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user.id);
        
        if (!userTenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        let query = dbInstance
          .select()
          .from(usageTransactions)
          .where(eq(usageTransactions.tenantId, userTenant.id));

        if (input.operation) {
          query = query.where(and(
            eq(usageTransactions.tenantId, userTenant.id),
            eq(usageTransactions.operation, input.operation)
          ));
        }

        const transactions = await query
          .orderBy(desc(usageTransactions.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Para cliente: mostrar apenas créditos (não custo real)
        return transactions.map(t => ({
          id: t.id,
          operation: t.operation,
          model: t.model,
          tokensInput: t.tokensInput,
          tokensOutput: t.tokensOutput,
          totalTokens: t.totalTokens,
          creditsUsed: t.creditsUsed, // Cliente vê créditos
          createdAt: t.createdAt,
        }));
      }),

    // Obter transações de uso (admin - mostra custo real em USD)
    getTenantUsageTransactions: adminProcedure
      .input(z.object({
        tenantId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        operation: z.enum(['chat', 'audio', 'image', 'format', 'pdf']).optional(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        let query = dbInstance
          .select()
          .from(usageTransactions)
          .where(eq(usageTransactions.tenantId, input.tenantId));

        if (input.operation) {
          query = query.where(and(
            eq(usageTransactions.tenantId, input.tenantId),
            eq(usageTransactions.operation, input.operation)
          ));
        }

        const transactions = await query
          .orderBy(desc(usageTransactions.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Para admin: mostrar custo real em USD
        return transactions.map(t => ({
          id: t.id,
          operation: t.operation,
          model: t.model,
          tokensInput: t.tokensInput,
          tokensOutput: t.tokensOutput,
          totalTokens: t.totalTokens,
          costUSD: parseFloat(t.costUSD), // Admin vê custo real
          creditsUsed: t.creditsUsed,
          metadata: t.metadata ? JSON.parse(t.metadata) : null,
          createdAt: t.createdAt,
        }));
      }),

    // Obter consumo agregado do mês (cliente - mostra créditos)
    getMyMonthlyConsumption: protectedProcedure.query(async ({ ctx }) => {
      const tenants = await db.getAllTenants();
      const userTenant = tenants.find(t => t.ownerId === ctx.user.id);
      
      if (!userTenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      }

      const currentMonth = await db.getCurrentMonthUsage(userTenant.id);
      const plan = userTenant.currentPlanId ? await db.getPlanById(userTenant.currentPlanId) : null;

      if (!currentMonth) {
        return {
          creditsUsed: 0,
          monthlyCredits: plan?.monthlyCredits || 0,
          creditsRemaining: plan?.monthlyCredits || 0,
          breakdown: {
            chat: { credits: 0, tokens: 0 },
            audio: { credits: 0, tokens: 0 },
            image: { credits: 0, tokens: 0 },
            format: { credits: 0, tokens: 0 },
          },
        };
      }

      // Converter custos para créditos para exibição ao cliente
      // (O cálculo real já foi feito, mas aqui mostramos apenas créditos)
      return {
        creditsUsed: currentMonth.totalCreditsUsed || 0,
        monthlyCredits: plan?.monthlyCredits || 0,
        creditsRemaining: Math.max(0, (plan?.monthlyCredits || 0) - (currentMonth.totalCreditsUsed || 0)),
        breakdown: {
          chat: {
            credits: Math.ceil(parseFloat(currentMonth.costChatUSD || "0") / 0.002 * 1.5), // Aproximação
            tokens: currentMonth.tokensChat || 0,
          },
          audio: {
            credits: Math.ceil(parseFloat(currentMonth.costAudioUSD || "0") / 0.002 * 1.5),
            tokens: currentMonth.tokensAudio || 0,
          },
          image: {
            credits: Math.ceil(parseFloat(currentMonth.costImageUSD || "0") / 0.002 * 1.5),
            tokens: currentMonth.tokensImage || 0,
          },
          format: {
            credits: Math.ceil(parseFloat(currentMonth.costFormatUSD || "0") / 0.002 * 1.5),
            tokens: currentMonth.tokensFormat || 0,
          },
        },
      };
    }),

    // Obter consumo agregado do mês (admin - mostra custo real em USD)
    getTenantMonthlyConsumption: adminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        const currentMonth = await db.getCurrentMonthUsage(input.tenantId);
        const tenant = await db.getTenantById(input.tenantId);
        const plan = tenant?.currentPlanId ? await db.getPlanById(tenant.currentPlanId) : null;

        if (!currentMonth) {
          return {
            costUSD: 0,
            creditsUsed: 0,
            monthlyCredits: plan?.monthlyCredits || 0,
            breakdown: {
              chat: { costUSD: 0, credits: 0, tokens: 0 },
              audio: { costUSD: 0, credits: 0, tokens: 0 },
              image: { costUSD: 0, credits: 0, tokens: 0 },
              format: { costUSD: 0, credits: 0, tokens: 0 },
            },
          };
        }

        // Para admin: mostrar custo real em USD
        return {
          costUSD: parseFloat(currentMonth.totalCostUSD || "0"),
          creditsUsed: currentMonth.totalCreditsUsed || 0,
          monthlyCredits: plan?.monthlyCredits || 0,
          breakdown: {
            chat: {
              costUSD: parseFloat(currentMonth.costChatUSD || "0"),
              credits: Math.ceil(parseFloat(currentMonth.costChatUSD || "0") / 0.002 * 1.5),
              tokens: currentMonth.tokensChat || 0,
            },
            audio: {
              costUSD: parseFloat(currentMonth.costAudioUSD || "0"),
              credits: Math.ceil(parseFloat(currentMonth.costAudioUSD || "0") / 0.002 * 1.5),
              tokens: currentMonth.tokensAudio || 0,
            },
            image: {
              costUSD: parseFloat(currentMonth.costImageUSD || "0"),
              credits: Math.ceil(parseFloat(currentMonth.costImageUSD || "0") / 0.002 * 1.5),
              tokens: currentMonth.tokensImage || 0,
            },
            format: {
              costUSD: parseFloat(currentMonth.costFormatUSD || "0"),
              credits: Math.ceil(parseFloat(currentMonth.costFormatUSD || "0") / 0.002 * 1.5),
              tokens: currentMonth.tokensFormat || 0,
            },
          },
        };
      }),
  }),

  // ========== ROTAS DE LOGS ==========
  
  logs: router({
    list: adminProcedure
      .input(z.object({
        tenantId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPlatformLogs(input.tenantId, input.limit);
      }),
  }),

  // ========== ROTAS DE PAGAMENTO (STRIPE) ==========
  
  payment: router({
    // Criar sessão de checkout pública (landing page)
    createPublicCheckoutSession: publicProcedure
      .input(z.object({
        planId: z.number(),
        email: z.string().email(),
        companyName: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar o plano
        const plan = await db.getPlanById(input.planId);
        if (!plan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' });
        }

        // Criar sessão de checkout no Stripe
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        
        const session = await stripe.checkout.sessions.create({
          customer_email: input.email,
          metadata: {
            planId: input.planId.toString(),
            companyName: input.companyName,
          },
          line_items: [
            {
              price: plan.stripePriceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          allow_promotion_codes: true,
          success_url: `${origin}/?checkout=success`,
          cancel_url: `${origin}/?checkout=canceled`,
        });

        return { checkoutUrl: session.url };
      }),

    // Criar sessão de checkout para assinatura
    createCheckoutSession: protectedProcedure
      .input(z.object({
        planId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        let tenantId: number | null = null;
        let tenant: db.Tenant | null = null;
        
        // Se for cliente, usar tenant direto
        if (ctx.tenant) {
          tenant = ctx.tenant;
          tenantId = ctx.tenant.id;
        } else if (ctx.user) {
          // Se for admin, buscar tenant pelo ownerId (compatibilidade)
          const tenants = await db.getAllTenants();
          const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
          if (userTenant) {
            tenant = userTenant;
            tenantId = userTenant.id;
          }
        }
        
        if (!tenant || !tenantId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        // Buscar o plano
        const plan = await db.getPlanById(input.planId);
        if (!plan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' });
        }

        // Criar sessão de checkout no Stripe
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        
        const session = await stripe.checkout.sessions.create({
          // Se já tem customer no Stripe, usa customer. Senão, usa customer_email
          ...(tenant.stripeCustomerId 
            ? { customer: tenant.stripeCustomerId }
            : { customer_email: tenant.email }
          ),
          client_reference_id: tenantId.toString(),
          metadata: {
            tenant_id: tenantId.toString(),
            user_id: ctx.user?.id?.toString() || '',
            customer_email: tenant.email,
            customer_name: tenant.companyName,
          },
          line_items: [
            {
              price: plan.stripePriceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          allow_promotion_codes: true,
          success_url: `${origin}/client/subscription?success=true`,
          cancel_url: `${origin}/client/subscription?canceled=true`,
        });

        return { checkoutUrl: session.url };
      }),

    // Criar portal do cliente para gerenciar assinatura
    createCustomerPortal: protectedProcedure.mutation(async ({ ctx }) => {
      let tenantId: number | null = null;
      let tenant: db.Tenant | null = null;
      
      // Se for cliente, usar tenant direto
      if (ctx.tenant) {
        tenant = ctx.tenant;
        tenantId = ctx.tenant.id;
      } else if (ctx.user) {
        // Se for admin, buscar tenant pelo ownerId (compatibilidade)
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
        if (userTenant) {
          tenant = userTenant;
          tenantId = userTenant.id;
        }
      }
      
      if (!tenant || !tenantId || !tenant.stripeCustomerId) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Nenhuma assinatura ativa encontrada' 
        });
      }

      const origin = ctx.req.headers.origin || 'http://localhost:3000';

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${origin}/client/subscription`,
      });

      return { portalUrl: portalSession.url };
    }),

    // Obter informações da assinatura atual
    getSubscriptionInfo: protectedProcedure.query(async ({ ctx }) => {
      let tenantId: number | null = null;
      let tenant: db.Tenant | null = null;
      
      // Se for cliente, usar tenant direto
      if (ctx.tenant) {
        tenant = ctx.tenant;
        tenantId = ctx.tenant.id;
      } else if (ctx.user) {
        // Se for admin, buscar tenant pelo ownerId (compatibilidade)
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
        if (userTenant) {
          tenant = userTenant;
          tenantId = userTenant.id;
        }
      }
      
      if (!tenant || !tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      }

      if (!tenant.stripeSubscriptionId) {
        return { hasSubscription: false };
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
        const plan = await db.getPlanById(tenant.currentPlanId || 1);

        return {
          hasSubscription: true,
          status: subscription.status,
          currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          plan,
        };
      } catch (error) {
        console.error('[Stripe] Error fetching subscription:', error);
        return { hasSubscription: false };
      }
    }),
  }),

  // ========================================
  // ENDPOINTS PARA PAINEL DO CLIENTE
  // ========================================
  clientPanel: router({
    /**
     * Gera QR Code para conectar WhatsApp
     * Só retorna QR Code se a instância não estiver conectada
     */
    getQRCode: protectedProcedure.query(async ({ ctx }) => {
    // Se for cliente, usar tenant direto
    let tenant = ctx.tenant;
    
    // Se for admin, buscar tenant pelo ownerId (compatibilidade)
    if (!tenant && ctx.user) {
      tenant = await db.getTenantByUserId(ctx.user.id);
    }
    
    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cliente não encontrado',
      });
    }

    if (!tenant.evolutionInstanceName) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Instância Evolution não provisionada',
      });
    }

    try {
      // Verificar status primeiro
      const status = await getConnectionStatus(tenant.evolutionInstanceName);
      
      // Se já estiver conectado, não precisa de QR Code
      if (status === "open") {
        return {
          qrCode: null,
          status,
          instanceName: tenant.evolutionInstanceName,
        };
      }
      
      // Só gerar QR Code se não estiver conectado
      const qrCodeBase64 = await generateQRCode(tenant.evolutionInstanceName);
      
      return {
        qrCode: qrCodeBase64,
        status,
        instanceName: tenant.evolutionInstanceName,
      };
    } catch (error: any) {
      // Se der erro ao gerar QR Code mas a instância estiver conectada, retornar status
      try {
        const status = await getConnectionStatus(tenant.evolutionInstanceName);
        if (status === "open") {
          return {
            qrCode: null,
            status,
            instanceName: tenant.evolutionInstanceName,
          };
        }
      } catch {
        // Ignorar erro de status
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erro ao gerar QR Code: ${error.message}`,
      });
    }
  }),

    /**
     * Verifica status da conexão WhatsApp
     */
    getWhatsAppStatus: protectedProcedure.query(async ({ ctx }) => {
    // Se for cliente, usar tenant direto
    let tenant = ctx.tenant;
    
    // Se for admin, buscar tenant pelo ownerId (compatibilidade)
    if (!tenant && ctx.user) {
      tenant = await db.getTenantByUserId(ctx.user.id);
    }
    
    if (!tenant || !tenant.evolutionInstanceName) {
      return { status: 'not_provisioned' };
    }

    const status = await getConnectionStatus(tenant.evolutionInstanceName);
    return { status, instanceName: tenant.evolutionInstanceName };
  }),

    /**
     * Desconecta WhatsApp e permite regenerar QR Code
     */
    disconnectWhatsApp: protectedProcedure.mutation(async ({ ctx }) => {
    // Se for cliente, usar tenant direto
    let tenant = ctx.tenant;
    
    // Se for admin, buscar tenant pelo ownerId (compatibilidade)
    if (!tenant && ctx.user) {
      tenant = await db.getTenantByUserId(ctx.user.id);
    }
    
    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cliente não encontrado',
      });
    }

    if (!tenant.evolutionInstanceName) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Instância Evolution não provisionada',
      });
    }

    try {
      await logoutInstance(tenant.evolutionInstanceName);
      return { success: true, message: 'WhatsApp desconectado com sucesso' };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erro ao desconectar WhatsApp: ${error.message}`,
      });
    }
  }),

    /**
     * Ativa o agente de IA enviando POST para webhook do N8N
     * Isso cria o webhook no Chatwoot automaticamente
     */
    activateAgent: protectedProcedure.mutation(async ({ ctx }) => {
      // Se for cliente, usar tenant direto
      let tenant = ctx.tenant;
      
      // Se for admin, buscar tenant pelo ownerId (compatibilidade)
      if (!tenant && ctx.user) {
        tenant = await db.getTenantByUserId(ctx.user.id);
      }
      
      if (!tenant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        });
      }

      if (!tenant.n8nWorkflowId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Workflow N8N não provisionado',
        });
      }

      // Verificar se o workflow está publicado (N8N 2.1.4+)
      const isPublished = await isWorkflowPublished(tenant.n8nWorkflowId);
      if (!isPublished) {
        console.log(`[Client] ⚠️ Workflow ${tenant.n8nWorkflowId} não está publicado. Tentando publicar...`);
        try {
          await activateWorkflow(tenant.n8nWorkflowId);
          console.log(`[Client] ✅ Workflow ${tenant.n8nWorkflowId} publicado com sucesso`);
        } catch (error: any) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Workflow N8N não está publicado e não foi possível publicar: ${error.message}. Por favor, publique manualmente no N8N.`,
          });
        }
      }

      // Validar variáveis de ambiente necessárias
      const n8nApiUrl = process.env.N8N_API_URL;
      const createWebhookWorkflowUrl = process.env.N8N_CREATE_WEBHOOK_WORKFLOW_URL;
      
      if (!n8nApiUrl) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'N8N_API_URL não está configurado. Verifique as variáveis de ambiente.',
        });
      }

      if (!createWebhookWorkflowUrl) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'N8N_CREATE_WEBHOOK_WORKFLOW_URL não está configurado. Verifique as variáveis de ambiente.',
        });
      }

      // URL do webhook do N8N para este tenant (que será criado no Chatwoot)
      const tenantWebhookUrl = `${n8nApiUrl}/webhook/tenant_${tenant.id}`;
      
      // Validar variáveis do Chatwoot
      const chatwootUrl = process.env.CHATWOOT_URL;
      const chatwootToken = process.env.CHATWOOT_API_TOKEN;
      const chatwootAccountId = process.env.CHATWOOT_ACCOUNT_ID;
      
      if (!chatwootUrl || !chatwootToken || !chatwootAccountId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Variáveis do Chatwoot não configuradas (CHATWOOT_URL, CHATWOOT_API_TOKEN, CHATWOOT_ACCOUNT_ID).',
        });
      }

      try {
        // Chamar o workflow do N8N que cria o webhook no Chatwoot
        // Este workflow recebe os parâmetros e faz a chamada à API do Chatwoot
        const response = await axios.post(createWebhookWorkflowUrl, {
          tenantId: tenant.id,
          webhookUrl: tenantWebhookUrl,
          chatwootAccountId,
          chatwootUrl,
          chatwootToken,
          action: 'activate',
          timestamp: new Date().toISOString(),
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 segundos (criação de webhook pode demorar)
        });

        console.log(`[Client] ✅ Agente ativado para tenant ${tenant.id}`);
        console.log(`[Client] Resposta do workflow N8N:`, response.status, response.data);

        // Criar/atualizar Agent Bot no Chatwoot e conectar ao inbox
        let agentBotCreated = false;
        if (tenant.chatwootInboxId) {
          try {
            const botName = `Agente ${tenant.companyName || `Tenant ${tenant.id}`}`;
            const agentBot = await createOrUpdateChatwootAgentBot(
              botName,
              tenantWebhookUrl,
              `Agent bot para ${tenant.companyName || `Tenant ${tenant.id}`} - gerado automaticamente`
            );
            
            // IMPORTANTE: Salvar ID e token PRIMEIRO, antes de tentar conectar
            // Assim, mesmo se a conexão falhar, o token já estará salvo
            console.log(`[Client] 💾 Salvando Agent Bot no banco: ID=${agentBot.id}, Token=${agentBot.token ? '***' + agentBot.token.slice(-4) : 'NÃO ENCONTRADO'}`);
            
            const updateData: any = {
              chatwootAgentBotId: agentBot.id,
            };
            
            if (agentBot.token) {
              updateData.chatwootAgentBotToken = agentBot.token;
            }
            
            await db.updateTenant(tenant.id, updateData);
            
            // Verificar se foi salvo corretamente
            const updatedTenant = await db.getTenantById(tenant.id);
            console.log(`[Client] ✅ Verificação pós-salvamento: chatwootAgentBotId=${updatedTenant?.chatwootAgentBotId}, chatwootAgentBotToken=${updatedTenant?.chatwootAgentBotToken ? '***' + updatedTenant.chatwootAgentBotToken.slice(-4) : 'NULL'}`);
            
            // Agora tentar conectar o bot ao inbox (não crítico se falhar)
            try {
              await connectAgentBotToInbox(tenant.chatwootInboxId, agentBot.id);
              console.log(`[Client] ✅ Agent Bot conectado ao inbox ${tenant.chatwootInboxId}`);
              agentBotCreated = true;
            } catch (connectError: any) {
              console.warn(`[Client] ⚠️ Erro ao conectar Agent Bot ao inbox (não crítico):`, connectError.message);
              // O bot foi criado e o token foi salvo, apenas a conexão falhou
              agentBotCreated = true; // Consideramos criado mesmo sem conexão
            }
            
            console.log(`[Client] ✅ Agent Bot criado e token salvo no banco de dados`);
          } catch (error: any) {
            console.warn(`[Client] ⚠️ Erro ao criar Agent Bot (não crítico):`, error.message);
            // Não falhar a ativação se o Agent Bot não for criado
          }
        } else {
          console.warn(`[Client] ⚠️ Inbox ID não encontrado, pulando criação do Agent Bot`);
        }

        await db.createPlatformLog({
          tenantId: tenant.id,
          eventType: 'agent_activated',
          severity: 'info',
          message: `Agente de IA ativado via workflow N8N. Webhook criado no Chatwoot: ${tenantWebhookUrl}${agentBotCreated ? '. Agent Bot criado e conectado.' : ''}`,
          metadata: JSON.stringify({
            workflowUrl: createWebhookWorkflowUrl,
            tenantWebhookUrl,
            responseStatus: response.status,
            agentBotCreated,
          }),
        });

        return {
          success: true,
          message: 'Agente ativado com sucesso! O webhook foi criado no Chatwoot.' + (agentBotCreated ? ' Agent Bot configurado automaticamente.' : ''),
        };
      } catch (error: any) {
        console.error(`[Client] ❌ Erro ao ativar agente para tenant ${tenant.id}:`);
        console.error(`[Client] URL chamada: ${createWebhookWorkflowUrl}`);
        console.error(`[Client] Erro:`, error.response?.data || error.message);
        console.error(`[Client] Status:`, error.response?.status);
        
        if (error.response?.status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Workflow de criação de webhook não encontrado. Verifique se N8N_CREATE_WEBHOOK_WORKFLOW_URL está correto: ${createWebhookWorkflowUrl}`,
          });
        }

        if (error.response?.status === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Erro na requisição ao workflow N8N: ${error.response?.data?.message || error.message}`,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao ativar agente: ${error.response?.data?.message || error.message}`,
        });
      }
    }),

    /**
     * Verifica se o agente está ativado
     */
    getAgentStatus: protectedProcedure.query(async ({ ctx }) => {
      // Se for cliente, usar tenant direto
      let tenant = ctx.tenant;
      
      // Se for admin, buscar tenant pelo ownerId (compatibilidade)
      if (!tenant && ctx.user) {
        tenant = await db.getTenantByUserId(ctx.user.id);
      }
      
      if (!tenant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        });
      }

      // Agente está ativado se tiver Agent Bot ID
      const isActivated = !!tenant.chatwootAgentBotId;
      
      return {
        isActivated,
        agentBotId: tenant.chatwootAgentBotId || null,
        inboxId: tenant.chatwootInboxId || null,
      };
    }),

    /**
     * Desativa o agente (exclui webhook e Agent Bot do Chatwoot)
     */
    deactivateAgent: protectedProcedure.mutation(async ({ ctx }) => {
      // Se for cliente, usar tenant direto
      let tenant = ctx.tenant;
      
      // Se for admin, buscar tenant pelo ownerId (compatibilidade)
      if (!tenant && ctx.user) {
        tenant = await db.getTenantByUserId(ctx.user.id);
      }
      
      if (!tenant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        });
      }

      if (!tenant.chatwootAgentBotId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Agente não está ativado',
        });
      }

      const n8nApiUrl = process.env.N8N_API_URL;
      if (!n8nApiUrl) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'N8N_API_URL não está configurado',
        });
      }

      const tenantWebhookUrl = `${n8nApiUrl}/webhook/tenant_${tenant.id}`;

      try {
        // 1. Desconectar Agent Bot do inbox (se houver inbox)
        if (tenant.chatwootInboxId) {
          try {
            await disconnectAgentBotFromInbox(tenant.chatwootInboxId);
            console.log(`[Client] ✅ Agent Bot desconectado do inbox ${tenant.chatwootInboxId}`);
          } catch (error: any) {
            console.warn(`[Client] ⚠️ Erro ao desconectar Agent Bot (não crítico):`, error.message);
          }
        }

        // 2. Excluir Agent Bot
        try {
          await deleteChatwootAgentBot(tenant.chatwootAgentBotId);
          console.log(`[Client] ✅ Agent Bot ${tenant.chatwootAgentBotId} excluído`);
        } catch (error: any) {
          console.warn(`[Client] ⚠️ Erro ao excluir Agent Bot (não crítico):`, error.message);
        }

        // 3. Excluir webhook do Chatwoot (criado pelo N8N)
        try {
          const webhookDeleted = await deleteChatwootWebhookByUrl(tenantWebhookUrl);
          if (webhookDeleted) {
            console.log(`[Client] ✅ Webhook ${tenantWebhookUrl} excluído do Chatwoot`);
          } else {
            console.log(`[Client] ⚠️ Webhook ${tenantWebhookUrl} não encontrado (pode já ter sido excluído)`);
          }
        } catch (error: any) {
          console.warn(`[Client] ⚠️ Erro ao excluir webhook (não crítico):`, error.message);
        }

        // 4. Limpar campos no banco de dados
        await db.updateTenant(tenant.id, {
          chatwootAgentBotId: null,
          chatwootAgentBotToken: null,
        });

        await db.createPlatformLog({
          tenantId: tenant.id,
          eventType: 'agent_deactivated',
          severity: 'info',
          message: `Agente de IA desativado. Webhook e Agent Bot removidos do Chatwoot.`,
          metadata: JSON.stringify({
            tenantWebhookUrl,
            agentBotId: tenant.chatwootAgentBotId,
          }),
        });

        return {
          success: true,
          message: 'Agente desativado com sucesso! Webhook e Agent Bot foram removidos.',
        };
      } catch (error: any) {
        console.error(`[Client] ❌ Erro ao desativar agente para tenant ${tenant.id}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao desativar agente: ${error.message}`,
        });
      }
    }),

    /**
     * Atualiza configuração do agente (prompt)
     */
    updateAgentConfig: protectedProcedure
    .input(z.object({
      systemPrompt: z.string().min(10, 'Prompt deve ter no mínimo 10 caracteres'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Se for cliente, usar tenant direto
      let tenant = ctx.tenant;
      
      // Se for admin, buscar tenant pelo ownerId (compatibilidade)
      if (!tenant && ctx.user) {
        tenant = await db.getTenantByUserId(ctx.user.id);
      }
      
      if (!tenant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        });
      }

      await db.updateAgentConfig(tenant.id, {
        systemPrompt: input.systemPrompt,
      });

      await db.createPlatformLog({
        tenantId: tenant.id,
        eventType: 'config_updated',
        severity: 'info',
        message: 'Configuração do agente atualizada',
      });

      return { success: true };
    }),

    /**
     * Busca configuração atual do agente
     */
    getAgentConfig: protectedProcedure.query(async ({ ctx }) => {
    // Se for cliente, usar tenant direto
    let tenant = ctx.tenant;
    
    // Se for admin, buscar tenant pelo ownerId (compatibilidade)
    if (!tenant && ctx.user) {
      tenant = await db.getTenantByUserId(ctx.user.id);
    }
    
    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cliente não encontrado',
      });
    }

    const config = await db.getAgentConfig(tenant.id);
    return config;
    }),

    /**
     * Gera systemPrompt usando OpenAI baseado nas respostas do usuário
     */
    generateSystemPrompt: protectedProcedure
      .input(z.object({
        businessName: z.string().min(1, "Nome da empresa é obrigatório"),
        businessType: z.string().optional(),
        // Endereço completo
        street: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        // Área de atendimento
        serviceArea: z.enum(['city', 'state', 'country']).optional(),
        // Telefone formatado
        phone: z.string().optional(),
        // Horário de funcionamento
        businessHours: z.string().optional(),
        // Formas de pagamento
        paymentMethods: z.array(z.string()).optional(),
        // Personalidade do agente
        personality: z.enum([
          'professional', 
          'friendly', 
          'casual', 
          'formal',
          'consultative',
          'empathetic',
          'energetic',
          'calm'
        ]).optional(),
        // Informações adicionais
        additionalInfo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenant = ctx.tenant;
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
        }

        // Verificar se já existe configuração
        const existingConfig = await db.getAgentConfig(tenant.id);
        const isUpdate = !!existingConfig;

        // Construir endereço completo
        const addressParts = [];
        if (input.street) addressParts.push(input.street);
        if (input.neighborhood) addressParts.push(input.neighborhood);
        if (input.city) addressParts.push(input.city);
        if (input.state) addressParts.push(input.state);
        if (input.zipCode) addressParts.push(`CEP: ${input.zipCode}`);
        const fullAddress = addressParts.join(', ');

        // Construir área de atendimento
        const serviceAreaText = input.serviceArea === 'city' 
          ? (input.city ? `apenas na cidade de ${input.city}` : 'apenas na sua cidade')
          : input.serviceArea === 'state'
          ? (input.state ? `em todo o estado de ${input.state}` : 'em todo o seu estado')
          : input.serviceArea === 'country'
          ? 'em todo o Brasil'
          : '';

        // Construir prompt para OpenAI baseado no exemplo CaduIA mas adaptado para venda/orientação
        const personalityDescriptions: Record<string, string> = {
          professional: 'Profissional, técnico e objetivo. Foca em eficiência e precisão.',
          friendly: 'Amigável, descontraído e acolhedor. Cria conexão emocional com o cliente.',
          casual: 'Casual, próximo e descontraído. Comunicação informal mas respeitosa.',
          formal: 'Formal, respeitoso e cerimonioso. Mantém distância profissional adequada.',
          consultative: 'Consultivo, analítico e orientador. Foca em entender necessidades e oferecer soluções.',
          empathetic: 'Empático, compreensivo e acolhedor. Prioriza o bem-estar emocional do cliente.',
          energetic: 'Energético, entusiasmado e motivador. Transmite energia positiva e dinamismo.',
          calm: 'Calmo, sereno e paciente. Transmite tranquilidade e confiança.',
        };

        const systemPromptTemplate = `Você é um especialista em criar prompts de sistema robustos e detalhados para agentes de IA de atendimento ao cliente, vendas e orientação.

Crie um prompt de sistema completo, profissional e altamente detalhado seguindo a estrutura do exemplo CaduIA abaixo, mas adaptado para um agente de atendimento/vendas da empresa "${input.businessName}".

**EXEMPLO DE ESTRUTURA (CaduIA - adaptar para venda/orientação):**

# **1. Identidade e Propósito**
Você é **[Nome do Agente]**, agente de IA da **[Nome da Empresa]**. [Definir personalidade e propósito]

Seu propósito é:
* [Listar objetivos principais: atender, vender, orientar, agendar, etc.]

---

## **2. Contexto e Conhecimento**
Você atua na **[Empresa]** em **[Cidade - Estado]** apoiando:
* [Tipos de clientes]

[Informações relevantes sobre a empresa]

Você tem acesso a:
* [Listar tools disponíveis, se houver]

---

## **3. Responsabilidades e Tarefas**
Você deve:
* [Listar responsabilidades específicas]
* [Como processar diferentes tipos de solicitações]

---

## **4. Diretrizes de Comportamento**
Você deve ser:
* [Características baseadas na personalidade escolhida]
* [Tom de voz específico]
* [Abordagem de comunicação]

---

## **5. Regras e Restrições**

### **Você DEVE:**
* [Listar obrigações]

### **Você NÃO DEVE:**
* [Listar proibições]

---

## **6. Fluxo de Trabalho**

### **CENÁRIO A — [Tipo de pergunta]**
1. [Passo 1]
2. [Passo 2]
...

### **CENÁRIO B — [Outro tipo]**
...

---

## **7. Tratamento de Casos Especiais**
[Como lidar com situações específicas]

---

## **8. Formato de Saída**
[Como estruturar respostas - discursivo, humanizado, focado em venda/orientação]

---

**INFORMAÇÕES DA EMPRESA PARA INCLUIR:**
${input.businessType ? `- Ramo de atividade: ${input.businessType}` : ''}
${fullAddress ? `- Endereço completo: ${fullAddress}` : ''}
${input.phone ? `- Telefone de contato: ${input.phone}` : ''}
${serviceAreaText ? `- Área de atendimento: ${serviceAreaText}` : ''}
${input.businessHours ? `- Horário de funcionamento: ${input.businessHours}` : ''}
${input.paymentMethods && input.paymentMethods.length > 0 ? `- Formas de pagamento aceitas: ${input.paymentMethods.join(', ')}` : ''}
${input.additionalInfo ? `- Informações adicionais: ${input.additionalInfo}` : ''}

**PERSONALIDADE DO AGENTE:**
${personalityDescriptions[input.personality || 'professional']}

**REQUISITOS ESPECÍFICOS:**
- O prompt deve ser robusto, detalhado e com rigor técnico (como o exemplo CaduIA)
- Adaptado para venda/orientação (não análise técnica)
- Respostas devem ser discursivas, humanizadas e focadas em ajudar/vender
- Inclua TODAS as informações da empresa fornecidas acima
- Mantenha consistência na personalidade: ${personalityDescriptions[input.personality || 'professional']}
- O prompt deve ter entre 1000-2000 palavras (robusto e completo)
- Seja específico sobre quando usar tools (se aplicável)
- Inclua instruções sobre gestão de contexto em conversas
- Formato de saída deve ser discursivo e natural, não técnico
- Foco em venda, orientação e atendimento humanizado

**IMPORTANTE:** Retorne APENAS o prompt de sistema final, sem explicações, sem markdown, sem comentários. Apenas o texto puro do prompt que será usado diretamente.`;

        // Chamar OpenAI
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'OpenAI API key não configurada no servidor' 
          });
        }

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'Você é um especialista em criar prompts de sistema robustos e detalhados para agentes de IA. Retorne APENAS o prompt final, sem explicações, sem markdown, sem comentários. Apenas o texto puro do prompt.',
                },
                {
                  role: 'user',
                  content: systemPromptTemplate,
                },
              ],
              temperature: 0.7,
              max_tokens: 3000, // Aumentado para prompts mais robustos
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('[OpenAI] Erro na API:', error);
            throw new Error(error.error?.message || `Erro HTTP ${response.status}`);
          }

          const data = await response.json();
          const generatedPrompt = data.choices[0].message.content.trim();

          // Salvar configurações no banco com todos os dados
          const companyInfo = JSON.stringify({
            name: input.businessName,
            type: input.businessType || '',
            street: input.street || '',
            neighborhood: input.neighborhood || '',
            city: input.city || '',
            state: input.state || '',
            zipCode: input.zipCode || '',
            fullAddress: fullAddress || '',
            serviceArea: input.serviceArea || '',
            phone: input.phone || '',
            businessHours: input.businessHours || '',
            paymentMethods: input.paymentMethods || [],
            personality: input.personality || 'professional',
            additionalInfo: input.additionalInfo || '',
          });

          // Se já existe config, atualizar. Se não, criar.
          if (isUpdate) {
            await db.updateAgentConfig(tenant.id, {
              systemPrompt: generatedPrompt,
              companyInfo: companyInfo,
              welcomeMessage: `Olá! Sou o assistente virtual da ${input.businessName}. Como posso ajudar você hoje?`,
            });
          } else {
            await db.createAgentConfig({
              tenantId: tenant.id,
              systemPrompt: generatedPrompt,
              companyInfo: companyInfo,
              welcomeMessage: `Olá! Sou o assistente virtual da ${input.businessName}. Como posso ajudar você hoje?`,
            });
          }

          await db.createPlatformLog({
            tenantId: tenant.id,
            eventType: 'config_updated',
            severity: 'info',
            message: `Configuração do agente ${isUpdate ? 'atualizada' : 'criada'} via Assistente de IA`,
          });

          return {
            systemPrompt: generatedPrompt,
            success: true,
            message: `Configurações ${isUpdate ? 'atualizadas' : 'geradas'} e salvas com sucesso!`,
          };
        } catch (error: any) {
          console.error('[OpenAI] Erro ao gerar prompt:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao gerar prompt: ${error.message}`,
          });
        }
      }),
  }),

  // ========== ROTAS DE INTERAÇÕES E ANÁLISE ==========
  
  interactions: router({
    // Buscar conversas do tenant
    getConversations: protectedProcedure.query(async ({ ctx }) => {
      let tenant = ctx.tenant;
      
      if (!tenant && ctx.user) {
        tenant = await db.getTenantByUserId(ctx.user.id);
      }
      
      if (!tenant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        });
      }

      const conversations = await db.getConversationsByTenantId(tenant.id, 100);
      return conversations;
    }),

    // Analisar interações selecionadas e sugerir melhorias no prompt
    analyzeAndImprovePrompt: protectedProcedure
      .input(z.object({
        conversationIds: z.array(z.number()).min(1, "Selecione pelo menos uma conversa"),
      }))
      .mutation(async ({ ctx, input }) => {
        let tenant = ctx.tenant;
        
        if (!tenant && ctx.user) {
          tenant = await db.getTenantByUserId(ctx.user.id);
        }
        
        if (!tenant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cliente não encontrado',
          });
        }

        // Buscar configuração atual do agente
        const currentConfig = await db.getAgentConfig(tenant.id);
        if (!currentConfig) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Configuração do agente não encontrada',
          });
        }

        // Buscar mensagens das conversas selecionadas
        const messages = await db.getMessagesByConversationIds(input.conversationIds);
        
        if (messages.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nenhuma mensagem encontrada nas conversas selecionadas',
          });
        }

        // Preparar contexto para análise com IA
        const conversationContext = messages
          .slice(0, 100) // Limitar a 100 mensagens para não exceder tokens
          .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
          .join('\n\n');

        const currentPrompt = currentConfig.systemPrompt || "";

        // Chamar OpenAI para analisar e sugerir melhorias
        try {
          const OpenAI = (await import("openai")).default;
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const analysisPrompt = `Você é um especialista em otimização de prompts para assistentes de IA.

Analise as seguintes interações entre usuários e um assistente de IA, junto com o prompt atual do sistema, e sugira melhorias específicas e acionáveis.

PROMPT ATUAL DO SISTEMA:
${currentPrompt}

INTERAÇÕES ANALISADAS:
${conversationContext}

INSTRUÇÕES:
1. Identifique padrões nas interações onde o assistente poderia ter respondido melhor
2. Identifique pontos onde o prompt atual é vago ou poderia ser mais específico
3. Sugira melhorias concretas e específicas no prompt
4. Mantenha o tom e personalidade geral, mas torne o prompt mais eficaz
5. Retorne APENAS o prompt melhorado, sem explicações adicionais
6. O prompt deve ser direto, claro e acionável

PROMPT MELHORADO:`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "Você é um especialista em otimização de prompts. Analise interações e sugira melhorias específicas e acionáveis no prompt do sistema.",
              },
              {
                role: "user",
                content: analysisPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          });

          const suggestedPrompt = completion.choices[0]?.message?.content?.trim() || currentPrompt;

          // Log da análise
          await db.createPlatformLog({
            tenantId: tenant.id,
            eventType: 'config_updated',
            severity: 'info',
            message: `Análise de ${input.conversationIds.length} conversas para melhoria do prompt`,
            metadata: JSON.stringify({
              conversationIds: input.conversationIds,
              messagesAnalyzed: messages.length,
            }),
          });

          return {
            suggestedPrompt,
            conversationsAnalyzed: input.conversationIds.length,
            messagesAnalyzed: messages.length,
          };
        } catch (error: any) {
          console.error("[Interactions] Erro ao analisar com IA:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao analisar interações: ${error.message}`,
          });
        }
      }),
  }),

  // ========== ADMIN USER MANAGEMENT ==========
  admin: router({
    users: router({
      // Listar todos os usuários admin
      list: adminProcedure.query(async () => {
        const allUsers = await db.getAllUsers();
        // Filtrar apenas admins (ou todos se quiser ver todos)
        return allUsers.filter(u => u.role === 'admin');
      }),

      // Criar novo usuário admin
      create: adminProcedure
        .input(z.object({
          name: z.string().min(1, { message: "Nome é obrigatório" }),
          email: z.string().email({ message: "Email inválido" }),
          password: z.string().min(8, { message: "Senha deve ter pelo menos 8 caracteres" }),
        }))
        .mutation(async ({ input }) => {
          // Verificar se email já existe
          const existingUser = await db.getUserByEmail(input.email.trim().toLowerCase());
          if (existingUser) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Este email já está em uso',
            });
          }

          // Gerar hash da senha
          const bcrypt = await import('bcryptjs');
          const passwordHash = await bcrypt.hash(input.password, 10);

          // Gerar openId único
          const crypto = await import('crypto');
          const openId = `admin_${crypto.randomBytes(16).toString('hex')}`;

          // Criar usuário
          const user = await db.createUser({
            openId,
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash,
            role: 'admin',
          });

          return user;
        }),

      // Atualizar usuário admin
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().min(1, { message: "Nome é obrigatório" }),
          email: z.string().email({ message: "Email inválido" }),
          password: z.string().min(8, { message: "Senha deve ter pelo menos 8 caracteres" }).optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, password, ...updates } = input;

          // Verificar se usuário existe
          const user = await db.getUserById(id);
          if (!user) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Usuário não encontrado',
            });
          }

          // Verificar se email já está em uso por outro usuário
          if (updates.email) {
            const existingUser = await db.getUserByEmail(updates.email.trim().toLowerCase());
            if (existingUser && existingUser.id !== id) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Este email já está em uso por outro usuário',
              });
            }
          }

          // Preparar atualizações
          const updateData: any = {
            name: updates.name.trim(),
            email: updates.email.trim().toLowerCase(),
          };

          // Se senha foi fornecida, gerar hash
          if (password) {
            const bcrypt = await import('bcryptjs');
            updateData.passwordHash = await bcrypt.hash(password, 10);
          }

          await db.updateUser(id, updateData);
          return { success: true };
        }),

      // Deletar usuário admin
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          // Não permitir deletar a si mesmo
          if (input.id === ctx.user.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Você não pode deletar seu próprio usuário',
            });
          }

          const user = await db.getUserById(input.id);
          if (!user) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Usuário não encontrado',
            });
          }

          await db.deleteUser(input.id);
          return { success: true };
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
