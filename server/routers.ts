import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure as adminProc } from "./_core/trpc";
import { configRouter } from "./routers/config";
import { plansRouter } from "./routers/plans";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { provisionTenant, deprovisionTenant, getTenantDatabaseCredentials } from "./tenant-provisioning";
import { cloneWorkflowForTenant, activateWorkflow, deactivateWorkflow, deleteWorkflow, getWorkflowExecutionStats } from "./n8n-integration";
import { createEvolutionInstance, generateQRCode, getConnectionStatus, deleteEvolutionInstance, logoutInstance } from "./evolution-integration";
import { getInboxConversations, getConversationMessages, getInboxStats } from "./chatwoot-integration";
import { notifyOwner } from "./_core/notification";
import Stripe from 'stripe';
import axios from 'axios';

const stripeApiKey = process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
if (stripeApiKey === 'sk_test_dummy') {
  console.warn('[Stripe] Nenhuma chave encontrada. Usando chave dummy (modo dev sem Stripe).');
}
const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-11-17.clover',
});

// Middleware para verificar se o usuário é admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
    });
  }
  return next({ ctx });
});

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
          const tenant = await db.createTenant({
            ownerId: ctx.user.id,
            companyName: input.companyName,
            email: input.email,
            subdomain: input.subdomain || undefined,
            status: 'active' as const,
            currentPlanId: input.planId,
          });

          console.log('✅ [STEP 2] Tenant criado com ID:', tenant.id);
          
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
            const evolutionResult = await createEvolutionInstance(tenant.id);
            console.log('✅ [STEP 4] Evolution criada:', evolutionResult.instanceName);
            evolutionInstanceName = evolutionResult.instanceName;
            evolutionApiKey = evolutionResult.apiKey;
            
            await db.updateTenant(tenant.id, {
              evolutionInstanceName,
              evolutionApiKey,
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
          
          // 7. Notificar o propriet\u00e1rio
              console.log('📧 [STEP 7] Notificando proprietário...');
          await notifyOwner({
            title: 'Novo Cliente Cadastrado',
            content: `Um novo cliente foi cadastrado: ${input.companyName} (${input.email})`,
          });

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

    // Deletar tenant
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const tenant = await db.getTenantById(input.id);
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
        }

        // Deletar workflow do N8N
        if (tenant.n8nWorkflowId) {
          await deleteWorkflow(tenant.n8nWorkflowId);
        }

        // Desprov isionar recursos do tenant
        await deprovisionTenant(input.id);

        // Marcar como deletado
        await db.deleteTenant(input.id);
        
        await db.createPlatformLog({
          tenantId: input.id,
          eventType: 'tenant_deleted',
          severity: 'info',
          message: `Tenant ${tenant.companyName} foi deletado`,
        });

        return { success: true };
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
      }))
      .mutation(async ({ input, ctx }) => {
        // Se for cliente, usar tenant direto
        if (ctx.tenant) {
          await db.updateAgentConfig(ctx.tenant.id, input);
          return { success: true };
        }
        
        // Se for admin, buscar tenant pelo ownerId (compatibilidade)
        if (ctx.user) {
          const tenants = await db.getAllTenants();
          const userTenant = tenants.find(t => t.ownerId === ctx.user!.id);
          
          if (!userTenant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
          }

          await db.updateAgentConfig(userTenant.id, input);
          return { success: true };
        }

        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' });
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

    // Métricas do próprio tenant (para cliente)
    getMyMetrics: protectedProcedure.query(async ({ ctx }) => {
      const tenants = await db.getAllTenants();
      const userTenant = tenants.find(t => t.ownerId === ctx.user.id);
      
      if (!userTenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      }

      const currentMonth = await db.getCurrentMonthUsage(userTenant.id);
      
      let workflowStats = null;
      if (userTenant.n8nWorkflowId) {
        workflowStats = await getWorkflowExecutionStats(userTenant.n8nWorkflowId);
      }

      return {
        currentMonth,
        workflowStats,
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
        // Buscar o tenant do usuário
        const tenants = await db.getAllTenants();
        const userTenant = tenants.find(t => t.ownerId === ctx.user.id);
        
        if (!userTenant) {
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
          customer_email: userTenant.email,
          client_reference_id: userTenant.id.toString(),
          metadata: {
            tenant_id: userTenant.id.toString(),
            user_id: ctx.user.id.toString(),
            customer_email: userTenant.email,
            customer_name: userTenant.companyName,
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
      const tenants = await db.getAllTenants();
      const userTenant = tenants.find(t => t.ownerId === ctx.user.id);
      
      if (!userTenant || !userTenant.stripeCustomerId) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Nenhuma assinatura ativa encontrada' 
        });
      }

      const origin = ctx.req.headers.origin || 'http://localhost:3000';

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: userTenant.stripeCustomerId,
        return_url: `${origin}/client/subscription`,
      });

      return { portalUrl: portalSession.url };
    }),

    // Obter informações da assinatura atual
    getSubscriptionInfo: protectedProcedure.query(async ({ ctx }) => {
      const tenants = await db.getAllTenants();
      const userTenant = tenants.find(t => t.ownerId === ctx.user.id);
      
      if (!userTenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      }

      if (!userTenant.stripeSubscriptionId) {
        return { hasSubscription: false };
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(userTenant.stripeSubscriptionId);
        const plan = await db.getPlanById(userTenant.currentPlanId || 1);

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

        await db.createPlatformLog({
          tenantId: tenant.id,
          eventType: 'agent_activated',
          severity: 'info',
          message: `Agente de IA ativado via workflow N8N. Webhook criado no Chatwoot: ${tenantWebhookUrl}`,
          metadata: JSON.stringify({
            workflowUrl: createWebhookWorkflowUrl,
            tenantWebhookUrl,
            responseStatus: response.status,
          }),
        });

        return {
          success: true,
          message: 'Agente ativado com sucesso! O webhook foi criado no Chatwoot.',
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
  }),
});

export type AppRouter = typeof appRouter;
