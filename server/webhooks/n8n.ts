import { Request, Response } from "express";
import * as db from "../db";
import { z } from "zod";
import { calculateCost, recordUsageTransaction, UsageData, checkCreditsAvailable, getTenantCredits } from "../credit-system";

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
    
    // Detectar se o N8N enviou campos individuais em vez do formato esperado
    // Se tem "operations" ou "ImputTokens" mas não tem "data", é formato alternativo
    // Pode ter "eventType" mas ainda não ter "data"
    if ((cleanedBody.operations || cleanedBody.ImputTokens !== undefined) && !cleanedBody.data) {
      console.log(`[N8N Webhook] 🔧 Detectado formato de campos individuais, convertendo...`);
      
      // Construir o objeto de uso
      const usageItem: any = {
        operation: cleanedBody.operations || cleanedBody.operation || "chat",
        model: cleanedBody.model || "gpt-4.1-mini",
        tokensInput: cleanedBody.ImputTokens || cleanedBody.tokensInput || cleanedBody.InputTokens || 0,
        tokensOutput: cleanedBody.OutputTokens || cleanedBody.tokensOutput || 0,
        totalTokens: cleanedBody.TotalTokens || cleanedBody.totalTokens || 0,
        isEstimated: true,
        metadata: {
          textLength: cleanedBody.textLegength || cleanedBody.textLength || 0,
          workflowId: cleanedBody.WorkFlowId || cleanedBody.workflowId || cleanedBody.idWorkflow,
          executionId: cleanedBody.ExecutionId || cleanedBody.executionId,
        }
      };
      
      // Manter eventType e timestamp se existirem, adicionar data
      cleanedBody = {
        ...cleanedBody,
        eventType: cleanedBody.eventType || "usage_tracking_batch",
        data: [usageItem],
        timestamp: cleanedBody.timestamp || new Date().toISOString()
      };
      
      // Remover campos individuais que não são mais necessários
      delete cleanedBody.operations;
      delete cleanedBody.operation;
      delete cleanedBody.ImputTokens;
      delete cleanedBody.InputTokens;
      delete cleanedBody.OutputTokens;
      delete cleanedBody.TotalTokens;
      delete cleanedBody.textLegength;
      delete cleanedBody.textLength;
      delete cleanedBody.WorkFlowId;
      delete cleanedBody.workflowId;
      delete cleanedBody.idWorkflow;
      delete cleanedBody.ExecutionId;
      delete cleanedBody.executionId;
      
      console.log(`[N8N Webhook] ✅ Convertido para formato padrão:`, JSON.stringify(cleanedBody, null, 2));
    }
    
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
      
      console.log(`[N8N Webhook] 🔍 Data original (tipo: ${typeof cleaned}, length: ${cleaned.length}):`, cleaned.substring(0, 500));
      
      // Remover "==" ou "=" do início
      if (cleaned.startsWith("==")) {
        cleaned = cleaned.substring(2).trim();
        console.log(`[N8N Webhook] 🔧 Removido "==" do início`);
      } else if (cleaned.startsWith("=")) {
        cleaned = cleaned.substring(1).trim();
        console.log(`[N8N Webhook] 🔧 Removido "=" do início`);
      }
      
      console.log(`[N8N Webhook] 🔍 Data após limpeza (length: ${cleaned.length}):`, cleaned.substring(0, 500));
      
      // Tentar parsear como JSON
      try {
        if (cleaned === "[]" || cleaned === "") {
          cleanedBody.data = [];
          console.log(`[N8N Webhook] ✅ Data vazio, definido como array vazio`);
        } else {
          // Verificar se começa com [ ou { para garantir que é JSON válido
          const trimmed = cleaned.trim();
          if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            cleanedBody.data = JSON.parse(trimmed);
            console.log(`[N8N Webhook] ✅ Data parseado com sucesso (tipo: ${Array.isArray(cleanedBody.data) ? 'array' : 'object'}, length: ${Array.isArray(cleanedBody.data) ? cleanedBody.data.length : 'N/A'})`);
          } else {
            // Se não começa com [ ou {, pode ser que o N8N não processou a expressão
            // Tentar buscar do body original ou retornar erro mais claro
            console.error(`[N8N Webhook] ❌ Data não é JSON válido - não começa com [ ou {`);
            console.error(`[N8N Webhook] ❌ Isso geralmente significa que o N8N não processou a expressão {{ }}`);
            console.error(`[N8N Webhook] ❌ Verifique se está usando ={{ JSON.stringify(...) }} no HTTP Request`);
            // Definir como array vazio para não quebrar o schema
            cleanedBody.data = [];
          }
        }
      } catch (e: any) {
        console.error(`[N8N Webhook] ❌ ERRO ao parsear data:`, e.message);
        console.error(`[N8N Webhook] ❌ Data original:`, cleanedBody.data);
        console.error(`[N8N Webhook] ❌ Data após limpeza:`, cleaned);
        console.error(`[N8N Webhook] ❌ Stack:`, e.stack);
        // Definir como array vazio para não quebrar o schema
        cleanedBody.data = [];
      }
    }
    
    console.log(`[N8N Webhook] 📦 Body após limpeza:`, JSON.stringify(cleanedBody, null, 2));
    
    // Validar payload com Zod
    let payload;
    try {
      payload = payloadSchema.parse(cleanedBody);
      console.log(`[N8N Webhook] ✅ Payload validado com sucesso`);
    } catch (e: any) {
      console.error(`[N8N Webhook] ❌ ERRO na validação Zod:`, e.message);
      console.error(`[N8N Webhook] ❌ Erros:`, e.errors);
      console.error(`[N8N Webhook] ❌ Body que falhou:`, JSON.stringify(cleanedBody, null, 2));
      return res.status(400).json({ 
        error: "JSON parameter needs to be valid JSON",
        details: e.errors,
        receivedBody: cleanedBody
      });
    }

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
        
        // Buscar primeiro agente do tenant para associar transações (se não tiver agentId no metadata)
        const { getFirstAgentByTenantId } = await import("../db");
        const defaultAgent = await getFirstAgentByTenantId(tenantId);
        const defaultAgentId = defaultAgent?.id;
        
        console.log(`[N8N Webhook] 🔍 Data recebido (tipo: ${typeof dataArray}):`, dataArray);
        
        // Se data não é array, pode ser que o N8N enviou campos individuais
        // Tentar construir o array a partir dos campos do payload
        if (!Array.isArray(dataArray) && typeof dataArray === "object" && dataArray !== null) {
          // Verificar se tem campos individuais (formato antigo/alternativo)
          if (payload.operations || payload.model || payload.ImputTokens !== undefined) {
            console.log(`[N8N Webhook] 🔧 Detectado formato de campos individuais, convertendo para array`);
            const usageItem: any = {
              operation: payload.operations || payload.operation || "chat",
              model: payload.model || "gpt-4.1-mini",
              tokensInput: payload.ImputTokens || payload.tokensInput || payload.InputTokens || 0,
              tokensOutput: payload.OutputTokens || payload.tokensOutput || 0,
              totalTokens: payload.TotalTokens || payload.totalTokens || 0,
              isEstimated: true,
              metadata: {
                textLength: payload.textLegength || payload.textLength || 0,
                workflowId: payload.WorkFlowId || payload.workflowId || payload.idWorkflow,
                executionId: payload.ExecutionId || payload.executionId,
                agentId: defaultAgentId, // Adicionar agentId ao metadata
              }
            };
            dataArray = [usageItem];
            console.log(`[N8N Webhook] ✅ Convertido para array:`, dataArray);
          }
        }
        
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

    // CRÍTICO: Verificar créditos ANTES de processar
    // Estimar créditos necessários para esta operação
    const costCalculation = await calculateCost(usageData);
    const estimatedCredits = costCalculation.creditsUsed;
    
    const hasCredits = await checkCreditsAvailable(tenantId, estimatedCredits);
    
    if (!hasCredits) {
      const credits = await getTenantCredits(tenantId);
      const currentCredits = credits.currentCredits || 0;
      
      console.warn(`[N8N Webhook] ⚠️ Créditos insuficientes para tenant ${tenantId}:`, {
        currentCredits,
        estimatedCredits,
        operation: usageData.operation,
        model: usageData.model,
      });
      
      // Lançar erro para N8N tratar (bloquear execução do workflow)
      throw new Error(`INSUFFICIENT_CREDITS: Saldo insuficiente (${currentCredits} créditos disponíveis, ~${estimatedCredits} necessários para ${usageData.operation} com ${usageData.model})`);
    }

    // Registrar transação (já verifica e deduz créditos)
    await recordUsageTransaction(tenantId, usageData, costCalculation);

    console.log(`[N8N Webhook] ✅ Uso registrado para tenant ${tenantId}:`, {
      operation: usageData.operation,
      model: usageData.model,
      tokens: usageData.totalTokens || (usageData.tokensInput || 0) + (usageData.tokensOutput || 0),
      costUSD: costCalculation.costUSD.toFixed(6),
      creditsUsed: costCalculation.creditsUsed,
    });
  } catch (error: any) {
    // Se for erro de créditos insuficientes, relançar para N8N tratar
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      console.error(`[N8N Webhook] ❌ ${error.message}`);
      throw error; // Relançar para retornar erro HTTP ao N8N
    }
    
    console.error(`[N8N Webhook] ❌ Erro ao processar uso para tenant ${tenantId}:`, error);
    // Outros erros não bloqueiam o webhook (apenas logam)
  }
}

