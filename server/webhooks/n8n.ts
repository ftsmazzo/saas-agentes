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
  console.log(`[N8N Webhook] 📦 Body completo:`, JSON.stringify(req.body, null, 2));
  console.log(`[N8N Webhook] 📦 Body.data (tipo: ${typeof req.body?.data}):`, req.body?.data);
  
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

    // Limpar expressões do N8N que podem vir como strings (ex: "=2026-01-02..." ou "==[...]")
    let cleanedBody = { ...req.body };
    
    // Limpar timestamp se for string começando com "=" ou "=="
    if (cleanedBody.timestamp && typeof cleanedBody.timestamp === "string") {
      if (cleanedBody.timestamp.startsWith("==")) {
        cleanedBody.timestamp = cleanedBody.timestamp.substring(2).trim();
      } else if (cleanedBody.timestamp.startsWith("=")) {
        cleanedBody.timestamp = cleanedBody.timestamp.substring(1).trim();
      }
    }
    
    // Limpar data se for string começando com "=" ou "==" (expressão N8N)
    if (cleanedBody.data && typeof cleanedBody.data === "string") {
      let cleaned = cleanedBody.data;
      
      // Remover "==" ou "=" do início
      if (cleaned.startsWith("==")) {
        cleaned = cleaned.substring(2).trim();
      } else if (cleaned.startsWith("=")) {
        cleaned = cleaned.substring(1).trim();
      }
      
      // Tentar parsear como JSON
      try {
        if (cleaned === "[]" || cleaned === "") {
          cleanedBody.data = [];
        } else {
          cleanedBody.data = JSON.parse(cleaned);
        }
      } catch (e) {
        console.warn(`[N8N Webhook] ⚠️ Não foi possível parsear data: ${cleanedBody.data}`);
        console.warn(`[N8N Webhook] ⚠️ Tentativa de parse após limpeza: ${cleaned}`);
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
        let dataArray = payload.data;
        
        console.log(`[N8N Webhook] 🔍 Data recebido (tipo: ${typeof dataArray}):`, dataArray);
        
        // Se data é "[object Object]", tentar buscar do body completo
        if (typeof dataArray === "string" && (dataArray === "[object Object]" || dataArray === "=[object Object]")) {
          console.warn(`[N8N Webhook] ⚠️ Data recebido como "[object Object]" - tentando buscar do body completo`);
          
          // Tentar buscar do req.body completo (pode estar em outro lugar)
          const fullBody = req.body;
          console.log(`[N8N Webhook] 🔍 Body completo:`, JSON.stringify(fullBody, null, 2));
          
          // Tentar encontrar allUsageData em diferentes lugares
          if (fullBody.data && typeof fullBody.data === "object" && !Array.isArray(fullBody.data)) {
            // Se data é um objeto, pode ser que o array esteja dentro
            const possibleArray = fullBody.data.allUsageData || 
                                 fullBody.data.data || 
                                 Object.values(fullBody.data)[0];
            
            if (Array.isArray(possibleArray)) {
              dataArray = possibleArray;
              console.log(`[N8N Webhook] ✅ Encontrado array em data.allUsageData ou similar`);
            } else {
              // Tentar converter objeto único para array
              dataArray = [fullBody.data];
              console.log(`[N8N Webhook] ⚠️ Convertendo objeto único para array`);
            }
          } else if (Array.isArray(fullBody.data)) {
            // Se já é array no body, usar direto
            dataArray = fullBody.data;
            console.log(`[N8N Webhook] ✅ Array encontrado diretamente no body.data`);
          } else {
            // Tentar buscar em qualquer propriedade do body que seja array
            const arrayKeys = Object.keys(fullBody).filter(key => Array.isArray(fullBody[key]));
            if (arrayKeys.length > 0) {
              dataArray = fullBody[arrayKeys[0]];
              console.log(`[N8N Webhook] ✅ Array encontrado em body.${arrayKeys[0]}`);
            } else {
              dataArray = [];
              console.warn(`[N8N Webhook] ❌ Não foi possível encontrar array no body`);
            }
          }
        } else if (typeof dataArray === "string") {
          // Se é string, tentar parsear
          if (dataArray.startsWith("=")) {
            const cleaned = dataArray.substring(1).trim();
            try {
              dataArray = cleaned === "[]" ? [] : JSON.parse(cleaned);
            } catch (e) {
              console.warn(`[N8N Webhook] ⚠️ Não foi possível parsear data: ${dataArray}`);
              dataArray = [];
            }
          } else {
            try {
              dataArray = JSON.parse(dataArray);
            } catch (e) {
              console.warn(`[N8N Webhook] ⚠️ Não foi possível parsear data: ${dataArray}`);
              dataArray = [];
            }
          }
        } else if (typeof dataArray === "object" && !Array.isArray(dataArray)) {
          // Se é objeto único, converter para array
          console.log(`[N8N Webhook] ⚠️ Data é objeto único, convertendo para array`);
          dataArray = [dataArray];
        }
        
        if (Array.isArray(dataArray)) {
          console.log(`[N8N Webhook] 📦 Processando ${dataArray.length} itens em lote`);
          for (const usageData of dataArray) {
            await handleUsageTracking(tenantId, { data: usageData });
          }
        } else {
          console.warn(`[N8N Webhook] ⚠️ usage_tracking_batch espera um array, recebeu:`, typeof dataArray, dataArray);
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

