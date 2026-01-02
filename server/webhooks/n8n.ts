import { Request, Response } from "express";
import * as db from "../db";
import { z } from "zod";
import { calculateCost, recordUsageTransaction, UsageData } from "../credit-system";

/**
 * Webhook para receber dados do N8N
 * Rota: /api/webhooks/n8n/:tenantId
 */
export async function handleN8NWebhook(req: Request, res: Response) {
  console.log(`[N8N Webhook] 🎯 HANDLER CHAMADO: ${req.method} ${req.originalUrl}`);
  console.log(`[N8N Webhook] 📍 Params:`, req.params);
  console.log(`[N8N Webhook] 📦 Body:`, JSON.stringify(req.body, null, 2));
  
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    if (!tenantId || isNaN(tenantId)) {
      console.error(`[N8N Webhook] ❌ tenantId inválido: ${req.params.tenantId}`);
      return res.status(400).json({ error: "tenantId inválido" });
    }
    
    console.log(`[N8N Webhook] ✅ tenantId válido: ${tenantId}`);

    // Validar payload
    const payloadSchema = z.object({
      eventType: z.enum([
        "message_received",
        "message_sent",
        "conversation_updated",
        "whatsapp_status",
        "error",
        "metrics",
        "usage_tracking", // Novo: rastreamento de consumo OpenAI
        "usage_tracking_batch", // Processamento em lote
      ]),
      data: z.any(),
      timestamp: z.string().optional(),
    });

    // Limpar expressões do N8N que podem vir como strings (ex: "=2026-01-02...")
    let cleanedBody = { ...req.body };
    
    // Limpar timestamp se for string começando com "="
    if (cleanedBody.timestamp && typeof cleanedBody.timestamp === "string" && cleanedBody.timestamp.startsWith("=")) {
      cleanedBody.timestamp = cleanedBody.timestamp.substring(1).trim();
    }
    
    // Limpar data se for string começando com "="
    if (cleanedBody.data && typeof cleanedBody.data === "string" && cleanedBody.data.startsWith("=")) {
      const cleaned = cleanedBody.data.substring(1).trim();
      try {
        cleanedBody.data = cleaned === "[]" ? [] : JSON.parse(cleaned);
      } catch (e) {
        console.warn(`[N8N Webhook] ⚠️ Não foi possível parsear data: ${cleanedBody.data}`);
        cleanedBody.data = [];
      }
    }
    
    const payload = payloadSchema.parse(cleanedBody);

    // Processar evento baseado no tipo
    switch (payload.eventType) {
      case "message_received":
      case "message_sent":
        await handleMessageEvent(tenantId, payload);
        break;

      case "conversation_updated":
        await handleConversationEvent(tenantId, payload);
        break;

      case "whatsapp_status":
        await handleWhatsAppStatusEvent(tenantId, payload);
        break;

      case "error":
        await handleErrorEvent(tenantId, payload);
        break;

      case "metrics":
        await handleMetricsEvent(tenantId, payload);
        break;

      case "usage_tracking":
        await handleUsageTracking(tenantId, payload);
        break;

      case "usage_tracking_batch":
        // Processar múltiplos usos em lote
        // Limpar expressões do N8N que podem vir como strings (ex: "=[]")
        let dataArray = payload.data;
        
        // Se data é uma string que começa com "=", tentar parsear
        if (typeof dataArray === "string") {
          if (dataArray.startsWith("=")) {
            // Remover o "=" e tentar parsear como JSON
            const cleaned = dataArray.substring(1).trim();
            try {
              dataArray = cleaned === "[]" ? [] : JSON.parse(cleaned);
            } catch (e) {
              console.warn(`[N8N Webhook] ⚠️ Não foi possível parsear data: ${dataArray}`);
              dataArray = [];
            }
          } else {
            // Tentar parsear como JSON
            try {
              dataArray = JSON.parse(dataArray);
            } catch (e) {
              console.warn(`[N8N Webhook] ⚠️ Não foi possível parsear data: ${dataArray}`);
              dataArray = [];
            }
          }
        }
        
        if (Array.isArray(dataArray)) {
          console.log(`[N8N Webhook] 📦 Processando ${dataArray.length} itens em lote`);
          for (const usageData of dataArray) {
            await handleUsageTracking(tenantId, { data: usageData });
          }
        } else {
          console.warn(`[N8N Webhook] ⚠️ usage_tracking_batch espera um array, recebeu:`, typeof dataArray);
        }
        break;

      default:
        console.warn(`[N8N Webhook] Tipo de evento desconhecido: ${payload.eventType}`);
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[N8N Webhook] Erro ao processar webhook:", error);
    res.status(400).json({ error: error.message || "Erro ao processar webhook" });
  }
}

/**
 * Processa eventos de mensagens
 */
async function handleMessageEvent(tenantId: number, payload: any) {
  const messageData = payload.data;

  // Buscar ou criar contato
  let contact = await db.getContactByPhoneNumber(tenantId, messageData.phoneNumber);
  if (!contact) {
    // Criar contato se não existir
    // Isso precisa ser implementado no db.ts
    console.log(`[N8N Webhook] Criar contato: ${messageData.phoneNumber}`);
  }

  // Buscar ou criar conversa
  // Salvar mensagem
  // Isso será implementado quando tivermos as funções no db.ts
  console.log(`[N8N Webhook] Mensagem processada para tenant ${tenantId}`);
}

/**
 * Processa eventos de conversa
 */
async function handleConversationEvent(tenantId: number, payload: any) {
  const conversationData = payload.data;
  console.log(`[N8N Webhook] Conversa atualizada para tenant ${tenantId}`);
  // Implementar atualização de conversa
}

/**
 * Processa eventos de status do WhatsApp
 */
async function handleWhatsAppStatusEvent(tenantId: number, payload: any) {
  const statusData = payload.data;
  console.log(`[N8N Webhook] Status WhatsApp atualizado para tenant ${tenantId}: ${statusData.status}`);
  // Implementar atualização de status
}

/**
 * Processa eventos de erro
 */
async function handleErrorEvent(tenantId: number, payload: any) {
  const errorData = payload.data;
  
  await db.createPlatformLog({
    tenantId,
    eventType: 'workflow_failed',
    severity: 'error',
    message: `Erro no workflow N8N: ${errorData.message || 'Erro desconhecido'}`,
    metadata: JSON.stringify(errorData),
  });

  console.error(`[N8N Webhook] Erro reportado para tenant ${tenantId}:`, errorData);
}

/**
 * Processa eventos de métricas
 */
async function handleMetricsEvent(tenantId: number, payload: any) {
  const metricsData = payload.data;
  console.log(`[N8N Webhook] Métricas recebidas para tenant ${tenantId}`);
  // Implementar salvamento de métricas
}

/**
 * Processa eventos de rastreamento de uso (consumo OpenAI)
 */
async function handleUsageTracking(tenantId: number, payload: any) {
  try {
    const usageData: UsageData = payload.data;

    // Validar dados obrigatórios
    if (!usageData.operation || !usageData.model) {
      console.warn(`[N8N Webhook] ⚠️ Dados de uso incompletos para tenant ${tenantId}:`, usageData);
      return;
    }

    // Calcular custo e créditos
    const costCalculation = await calculateCost(usageData);

    // Registrar transação
    await recordUsageTransaction(tenantId, usageData, costCalculation);

    console.log(`[N8N Webhook] ✅ Uso registrado para tenant ${tenantId}:`, {
      operation: usageData.operation,
      model: usageData.model,
      tokens: usageData.totalTokens || (usageData.tokensInput || 0) + (usageData.tokensOutput || 0),
      costUSD: costCalculation.costUSD.toFixed(6),
      creditsUsed: costCalculation.creditsUsed,
    });
  } catch (error: any) {
    console.error(`[N8N Webhook] ❌ Erro ao processar uso para tenant ${tenantId}:`, error);
    // Não falhar o webhook - apenas logar o erro
  }
}

