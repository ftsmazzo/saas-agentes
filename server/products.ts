/**
 * Definição de produtos e planos do Stripe
 * 
 * IMPORTANTE: Antes de usar em produção, você deve:
 * 1. Criar os produtos no Stripe Dashboard
 * 2. Atualizar os Price IDs aqui com os IDs reais do Stripe
 * 3. Sincronizar os planos no banco de dados usando a função seedPlans()
 */

export interface StripePlan {
  id: string;
  name: string;
  description: string;
  stripePriceId: string;
  priceMonthly: number; // Em centavos
  features: {
    maxWorkflowExecutions: number;
    maxConversations: number;
    maxStorageGB: number;
  };
}

/**
 * Planos disponíveis na plataforma
 * 
 * NOTA: Atualize os stripePriceId com os IDs reais do seu Stripe Dashboard
 */
export const STRIPE_PLANS: StripePlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Ideal para pequenas empresas começando com automação",
    stripePriceId: "price_XXXXXXXXXX", // Substitua com o ID real do Stripe
    priceMonthly: 9900, // R$ 99,00
    features: {
      maxWorkflowExecutions: 1000,
      maxConversations: 5000,
      maxStorageGB: 5,
    },
  },
  {
    id: "professional",
    name: "Professional",
    description: "Para empresas em crescimento que precisam de mais recursos",
    stripePriceId: "price_YYYYYYYYYY", // Substitua com o ID real do Stripe
    priceMonthly: 29900, // R$ 299,00
    features: {
      maxWorkflowExecutions: 5000,
      maxConversations: 20000,
      maxStorageGB: 20,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Solução completa para grandes operações",
    stripePriceId: "price_ZZZZZZZZZZ", // Substitua com o ID real do Stripe
    priceMonthly: 79900, // R$ 799,00
    features: {
      maxWorkflowExecutions: 20000,
      maxConversations: 100000,
      maxStorageGB: 100,
    },
  },
];

/**
 * Busca um plano pelo ID
 */
export function getPlanById(planId: string): StripePlan | undefined {
  return STRIPE_PLANS.find(plan => plan.id === planId);
}

/**
 * Busca um plano pelo Stripe Price ID
 */
export function getPlanByStripePriceId(stripePriceId: string): StripePlan | undefined {
  return STRIPE_PLANS.find(plan => plan.stripePriceId === stripePriceId);
}
