/**
 * Sistema de Créditos e Controle de Consumo
 * 
 * Este módulo gerencia:
 * - Cálculo de custos reais baseado em preços OpenAI
 * - Conversão de custos para créditos internos (parametrizável)
 * - Margem de lucro configurável
 */

import { getDb } from "./db";
import { 
  openaiPricing, 
  creditConfig, 
  tenantCredits, 
  usageTransactions,
  usageMetrics,
  OpenAIPricing,
  CreditConfig
} from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

/**
 * Interface para dados de uso recebidos do N8N
 */
export interface UsageData {
  operation: 'chat' | 'audio' | 'image' | 'format' | 'pdf';
  model: string;
  tokensInput?: number;
  tokensOutput?: number;
  totalTokens?: number;
  audioDurationSeconds?: number; // Para Whisper
  metadata?: any; // JSON com detalhes adicionais
}

/**
 * Interface para resultado de cálculo de custo
 */
export interface CostCalculation {
  costUSD: number;
  creditsUsed: number;
  pricing?: OpenAIPricing;
}

/**
 * Busca preço do modelo OpenAI
 */
export async function getModelPricing(model: string): Promise<OpenAIPricing | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(openaiPricing)
    .where(and(
      eq(openaiPricing.model, model),
      eq(openaiPricing.isActive, true)
    ))
    .limit(1);

  return result[0] || null;
}

/**
 * Busca configuração de créditos
 */
export async function getCreditConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(creditConfig)
    .where(eq(creditConfig.configKey, key))
    .limit(1);

  return result[0]?.configValue || null;
}

/**
 * Calcula custo real em USD baseado em tokens e modelo
 */
export async function calculateCost(usageData: UsageData): Promise<CostCalculation> {
  const pricing = await getModelPricing(usageData.model);
  
  if (!pricing) {
    console.warn(`[CreditSystem] ⚠️ Preço não encontrado para modelo ${usageData.model}, usando valores padrão`);
    // Valores padrão conservadores
    return {
      costUSD: 0.001, // $0.001 USD
      creditsUsed: 1,
    };
  }

  let costUSD = 0;

  // Para Whisper (transcrição de áudio)
  if (usageData.operation === 'audio' && pricing.pricePerMinute && usageData.audioDurationSeconds) {
    const minutes = usageData.audioDurationSeconds / 60;
    costUSD = Number(pricing.pricePerMinute) * minutes;
  } 
  // Para outros modelos (baseado em tokens)
  else {
    const tokensInput = usageData.tokensInput || 0;
    const tokensOutput = usageData.tokensOutput || 0;

    if (pricing.priceInputPer1M && tokensInput > 0) {
      costUSD += (tokensInput / 1_000_000) * Number(pricing.priceInputPer1M);
    }

    if (pricing.priceOutputPer1M && tokensOutput > 0) {
      costUSD += (tokensOutput / 1_000_000) * Number(pricing.priceOutputPer1M);
    }
  }

  // Converter para créditos
  const creditsUsed = await costToCredits(costUSD);

  return {
    costUSD,
    creditsUsed,
    pricing,
  };
}

/**
 * Converte custo em USD para créditos internos
 * Aplica margem de lucro configurável
 */
export async function costToCredits(costUSD: number): Promise<number> {
  // Buscar configuração de valor do crédito
  const creditValueUSDStr = await getCreditConfig('creditValueUSD');
  const creditValueUSD = creditValueUSDStr ? parseFloat(creditValueUSDStr) : 0.002; // Padrão: $0.002 por crédito

  // Buscar multiplicador de margem
  const markupStr = await getCreditConfig('markupMultiplier');
  const markup = markupStr ? parseFloat(markupStr) : 1.5; // Padrão: 50% de margem

  // Buscar mínimo de créditos
  const minCreditsStr = await getCreditConfig('minCreditsPerTransaction');
  const minCredits = minCreditsStr ? parseInt(minCreditsStr) : 1;

  // Calcular créditos: (custo / valor_do_crédito) * markup
  let credits = Math.ceil((costUSD / creditValueUSD) * markup);

  // Garantir mínimo
  if (credits < minCredits) {
    credits = minCredits;
  }

  return credits;
}

/**
 * Registra transação de uso e atualiza créditos do tenant
 */
export async function recordUsageTransaction(
  tenantId: number,
  usageData: UsageData,
  costCalculation: CostCalculation
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Criar transação detalhada
  console.log(`[CreditSystem] 💾 Gravando transação no banco para tenant ${tenantId}...`);
  const transactionResult = await db.insert(usageTransactions).values({
    tenantId,
    operation: usageData.operation,
    model: usageData.model,
    tokensInput: usageData.tokensInput || 0,
    tokensOutput: usageData.tokensOutput || 0,
    totalTokens: usageData.totalTokens || (usageData.tokensInput || 0) + (usageData.tokensOutput || 0),
    costUSD: costCalculation.costUSD.toString(),
    creditsUsed: costCalculation.creditsUsed,
    metadata: usageData.metadata ? JSON.stringify(usageData.metadata) : null,
  }).returning();
  
  console.log(`[CreditSystem] ✅ Transação gravada com ID: ${transactionResult[0]?.id || 'N/A'}`);

  // 2. Atualizar saldo de créditos do tenant
  // Buscar ou criar registro de créditos
  const existingCredits = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, tenantId))
    .limit(1);

  if (existingCredits[0]) {
    // Atualizar saldo existente
    console.log(`[CreditSystem] 💾 Atualizando créditos existentes para tenant ${tenantId}...`);
    const updateResult = await db
      .update(tenantCredits)
      .set({
        currentCredits: sql`${tenantCredits.currentCredits} - ${costCalculation.creditsUsed}`,
        totalCreditsUsed: sql`${tenantCredits.totalCreditsUsed} + ${costCalculation.creditsUsed}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantCredits.tenantId, tenantId))
      .returning();
    
    console.log(`[CreditSystem] ✅ Créditos atualizados. Novo saldo: ${updateResult[0]?.currentCredits || 'N/A'}`);
  } else {
    // Criar registro inicial (assumindo que créditos já foram adicionados via plano)
    console.log(`[CreditSystem] 💾 Criando registro de créditos para tenant ${tenantId}...`);
    const insertResult = await db.insert(tenantCredits).values({
      tenantId,
      currentCredits: -costCalculation.creditsUsed, // Negativo pois está deduzindo
      totalCreditsUsed: costCalculation.creditsUsed,
    }).returning();
    
    console.log(`[CreditSystem] ✅ Registro de créditos criado. Saldo inicial: ${insertResult[0]?.currentCredits || 'N/A'}`);
  }

  // 3. Atualizar métricas agregadas do mês atual
  await updateMonthlyMetrics(tenantId, usageData, costCalculation);
}

/**
 * Atualiza métricas agregadas do mês atual
 */
async function updateMonthlyMetrics(
  tenantId: number,
  usageData: UsageData,
  costCalculation: CostCalculation
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Buscar métrica do mês atual
  const existingMetric = await db
    .select()
    .from(usageMetrics)
    .where(and(
      eq(usageMetrics.tenantId, tenantId),
      gte(usageMetrics.periodStart, periodStart),
      lte(usageMetrics.periodEnd, periodEnd)
    ))
    .limit(1);

  const tokensInput = usageData.tokensInput || 0;
  const tokensOutput = usageData.tokensOutput || 0;
  const totalTokens = tokensInput + tokensOutput;

  if (existingMetric[0]) {
    // Atualizar métrica existente
    const updateData: any = {
      apiCallsOpenAI: sql`${usageMetrics.apiCallsOpenAI} + 1`,
      totalCostUSD: sql`${usageMetrics.totalCostUSD} + ${costCalculation.costUSD}`,
      totalCreditsUsed: sql`${usageMetrics.totalCreditsUsed} + ${costCalculation.creditsUsed}`,
    };

    // Atualizar por tipo de operação
    switch (usageData.operation) {
      case 'chat':
        updateData.tokensChat = sql`${usageMetrics.tokensChat} + ${totalTokens}`;
        updateData.costChatUSD = sql`${usageMetrics.costChatUSD} + ${costCalculation.costUSD}`;
        break;
      case 'audio':
        updateData.tokensAudio = sql`${usageMetrics.tokensAudio} + ${totalTokens}`;
        updateData.costAudioUSD = sql`${usageMetrics.costAudioUSD} + ${costCalculation.costUSD}`;
        break;
      case 'image':
        updateData.tokensImage = sql`${usageMetrics.tokensImage} + ${totalTokens}`;
        updateData.costImageUSD = sql`${usageMetrics.costImageUSD} + ${costCalculation.costUSD}`;
        break;
      case 'format':
        updateData.tokensFormat = sql`${usageMetrics.tokensFormat} + ${totalTokens}`;
        updateData.costFormatUSD = sql`${usageMetrics.costFormatUSD} + ${costCalculation.costUSD}`;
        break;
    }

    await db
      .update(usageMetrics)
      .set(updateData)
      .where(eq(usageMetrics.id, existingMetric[0].id));
  } else {
    // Criar nova métrica do mês
    const metricData: any = {
      tenantId,
      periodStart,
      periodEnd,
      apiCallsOpenAI: 1,
      totalCostUSD: costCalculation.costUSD.toString(),
      totalCreditsUsed: costCalculation.creditsUsed,
    };

    switch (usageData.operation) {
      case 'chat':
        metricData.tokensChat = totalTokens;
        metricData.costChatUSD = costCalculation.costUSD.toString();
        break;
      case 'audio':
        metricData.tokensAudio = totalTokens;
        metricData.costAudioUSD = costCalculation.costUSD.toString();
        break;
      case 'image':
        metricData.tokensImage = totalTokens;
        metricData.costImageUSD = costCalculation.costUSD.toString();
        break;
      case 'format':
        metricData.tokensFormat = totalTokens;
        metricData.costFormatUSD = costCalculation.costUSD.toString();
        break;
    }

    await db.insert(usageMetrics).values(metricData);
  }
}

/**
 * Verifica se tenant tem créditos suficientes
 */
export async function checkCreditsAvailable(tenantId: number, estimatedCredits: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const credits = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, tenantId))
    .limit(1);

  const currentCredits = credits[0]?.currentCredits || 0;
  return currentCredits >= estimatedCredits;
}

/**
 * Obtém saldo atual de créditos do tenant
 */
export async function getTenantCredits(tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(tenantCredits)
    .where(eq(tenantCredits.tenantId, tenantId))
    .limit(1);

  return result[0] || {
    tenantId,
    currentCredits: 0,
    totalCreditsPurchased: 0,
    totalCreditsUsed: 0,
    totalCreditsBonus: 0,
    lastResetDate: null,
    updatedAt: new Date(),
  };
}

/**
 * Calcula créditos estimados para um modelo baseado em exemplo de tokens
 * Útil para mostrar ao usuário quanto custa cada modelo
 */
export async function estimateCreditsForModel(
  model: string,
  exampleTokensInput: number = 1500,
  exampleTokensOutput: number = 2000
): Promise<number> {
  const usageData: UsageData = {
    operation: 'chat',
    model,
    tokensInput: exampleTokensInput,
    tokensOutput: exampleTokensOutput,
    totalTokens: exampleTokensInput + exampleTokensOutput,
  };

  const costCalculation = await calculateCost(usageData);
  return costCalculation.creditsUsed;
}

