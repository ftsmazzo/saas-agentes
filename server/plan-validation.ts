import { db } from "./db";
import { Plan } from "../drizzle/schema";

/**
 * Modelos permitidos por plano
 * - Básico (id: 1): Apenas modelos econômicos
 * - Pro (id: 2): Modelos econômicos + médios
 * - Enterprise (id: 3): Todos os modelos
 */
const ALLOWED_MODELS_BY_PLAN: Record<number, string[]> = {
  1: [
    // Plano Básico: apenas modelos econômicos
    "gpt-4o-mini",
    "gpt-4.1-mini",
    "gpt-3.5-turbo",
  ],
  2: [
    // Plano Pro: modelos econômicos + médios
    "gpt-4o-mini",
    "gpt-4.1-mini",
    "gpt-5-mini",
    "gpt-3.5-turbo",
    "gpt-4-turbo",
  ],
  3: [
    // Plano Enterprise: todos os modelos
    "gpt-4o",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4o-mini",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5.2",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
};

/**
 * Obtém modelos permitidos para um plano
 */
export function getAllowedModelsForPlan(planId: number | null | undefined): string[] {
  if (!planId || planId < 1 || planId > 3) {
    // Se não tiver plano ou plano inválido, retorna apenas modelos básicos
    return ALLOWED_MODELS_BY_PLAN[1];
  }
  return ALLOWED_MODELS_BY_PLAN[planId] || ALLOWED_MODELS_BY_PLAN[1];
}

/**
 * Verifica se um modelo é permitido para um plano
 */
export function isModelAllowedForPlan(model: string, planId: number | null | undefined): boolean {
  const allowedModels = getAllowedModelsForPlan(planId);
  return allowedModels.includes(model);
}

/**
 * Obtém o plano do tenant
 */
export async function getTenantPlan(tenantId: number): Promise<Plan | null> {
  const tenant = await db.getTenantById(tenantId);
  if (!tenant || !tenant.currentPlanId) {
    return null;
  }
  
  const plan = await db.getPlanById(tenant.currentPlanId);
  return plan || null;
}

/**
 * Valida se o tenant pode usar um modelo específico
 */
export async function validateModelForTenant(tenantId: number, model: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const plan = await getTenantPlan(tenantId);
  if (!plan) {
    return {
      allowed: false,
      reason: "Plano não encontrado. Faça upgrade para usar modelos avançados.",
    };
  }

  const allowed = isModelAllowedForPlan(model, plan.id);
  if (!allowed) {
    return {
      allowed: false,
      reason: `O modelo "${model}" não está disponível no seu plano atual (${plan.name}). Faça upgrade para o plano Enterprise para acessar todos os modelos.`,
    };
  }

  return { allowed: true };
}

/**
 * Valida se o tenant pode criar mais agentes
 */
export async function validateAgentCreation(tenantId: number): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxAllowed?: number;
}> {
  const plan = await getTenantPlan(tenantId);
  if (!plan) {
    return {
      allowed: false,
      reason: "Plano não encontrado.",
    };
  }

  // Contar agentes existentes (configs ativas)
  const config = await db.getAgentConfig(tenantId);
  // Se já existe uma config, significa que já tem 1 agente
  // Para múltiplos agentes, precisaríamos de uma tabela separada ou campo adicional
  // Por enquanto, assumimos 1 agente por tenant (config única)
  const currentCount = config ? 1 : 0;

  const maxAllowed = plan.maxAgents || 1;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${maxAllowed} agente(s) do seu plano. Faça upgrade para criar mais agentes.`,
      currentCount,
      maxAllowed,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed,
  };
}

/**
 * Valida se o tenant pode usar uma feature específica
 */
export async function validateFeatureForTenant(
  tenantId: number,
  feature: keyof Plan
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const plan = await getTenantPlan(tenantId);
  if (!plan) {
    return {
      allowed: false,
      reason: "Plano não encontrado.",
    };
  }

  const featureValue = plan[feature];
  
  // Features booleanas
  if (typeof featureValue === "boolean") {
    if (!featureValue) {
      const featureNames: Record<string, string> = {
        enableRAG: "RAG (Base de Conhecimento Avançada)",
        enableAdvancedAnalytics: "Analytics Avançados",
        enableCustomAPI: "API Personalizada",
        enableCustomWebhooks: "Webhooks Personalizados",
        enablePrioritySupport: "Suporte Prioritário",
        enableScheduling: "Agendamento",
        enableFAQ: "FAQ (Base de Conhecimento Simples)",
      };

      return {
        allowed: false,
        reason: `${featureNames[feature] || feature} não está disponível no seu plano atual. Faça upgrade para acessar esta funcionalidade.`,
      };
    }
  }

  return { allowed: true };
}

