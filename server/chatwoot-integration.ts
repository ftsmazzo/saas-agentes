import axios from "axios";

const chatwootApi = axios.create({
  baseURL: `${process.env.CHATWOOT_URL}/api/v1`,
  headers: {
    "api_access_token": process.env.CHATWOOT_API_TOKEN
  }
});

export interface ChatwootInbox {
  inboxId: number;
  inboxName: string;
  webhookUrl: string;
}

/**
 * Cria inbox Chatwoot para um tenant
 * Nota: Evolution API já cria o inbox automaticamente ao provisionar instância
 * Esta função é para casos onde precisamos criar manualmente
 */
export async function createChatwootInbox(
  tenantName: string,
  evolutionInstanceName: string
): Promise<ChatwootInbox> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    const response = await chatwootApi.post(`/accounts/${accountId}/inboxes`, {
      name: `${tenantName} - WhatsApp`,
      channel: {
        type: "api",
        webhook_url: `${process.env.EVOLUTION_API_URL}/webhook/${evolutionInstanceName}`
      }
    });

    return {
      inboxId: response.data.id,
      inboxName: response.data.name,
      webhookUrl: response.data.webhook_url
    };
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao criar inbox:", error.response?.data || error.message);
    throw new Error(`Falha ao criar inbox Chatwoot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Lista todas as conversas de um inbox
 */
export async function getInboxConversations(inboxId: number): Promise<any[]> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    const response = await chatwootApi.get(`/accounts/${accountId}/conversations`, {
      params: {
        inbox_id: inboxId,
        status: "all"
      }
    });

    return response.data.data.payload || [];
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar conversas:", error.response?.data || error.message);
    return [];
  }
}

/**
 * Busca mensagens de uma conversa específica
 */
export async function getConversationMessages(conversationId: number): Promise<any[]> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    const response = await chatwootApi.get(
      `/accounts/${accountId}/conversations/${conversationId}/messages`
    );

    return response.data.payload || [];
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar mensagens:", error.response?.data || error.message);
    return [];
  }
}

/**
 * Busca estatísticas de um inbox
 */
export async function getInboxStats(inboxId: number): Promise<{
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  avgResponseTime: number;
}> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    // Buscar conversas
    const conversations = await getInboxConversations(inboxId);
    
    const stats = {
      totalConversations: conversations.length,
      openConversations: conversations.filter((c: any) => c.status === "open").length,
      resolvedConversations: conversations.filter((c: any) => c.status === "resolved").length,
      avgResponseTime: 0 // Calcular média de tempo de resposta se necessário
    };

    return stats;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar estatísticas:", error.response?.data || error.message);
    return {
      totalConversations: 0,
      openConversations: 0,
      resolvedConversations: 0,
      avgResponseTime: 0
    };
  }
}

/**
 * Deleta inbox Chatwoot
 */
export async function deleteChatwootInbox(inboxId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.delete(`/accounts/${accountId}/inboxes/${inboxId}`);
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao deletar inbox:", error.response?.data || error.message);
    throw new Error(`Falha ao deletar inbox Chatwoot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Cria webhook no Chatwoot para um tenant
 * O webhook aponta para o N8N workflow do tenant
 */
export async function createChatwootWebhook(
  tenantId: number,
  n8nWebhookUrl: string
): Promise<{ webhookId: number; webhookUrl: string }> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const chatwootUrl = process.env.CHATWOOT_URL;
    const chatwootToken = process.env.CHATWOOT_API_TOKEN;
    
    if (!accountId || !chatwootUrl || !chatwootToken) {
      throw new Error("CHATWOOT_ACCOUNT_ID, CHATWOOT_URL ou CHATWOOT_API_TOKEN não configurados");
    }
    
    console.log("[Chatwoot] Tentando criar webhook...", {
      accountId,
      chatwootUrl,
      tenantId,
      n8nWebhookUrl,
      endpoint: `${chatwootUrl}/api/v1/accounts/${accountId}/webhooks`
    });
    
    // Criar webhook no Chatwoot
    // API: POST /api/v1/accounts/{account_id}/webhooks
    // Formato baseado na documentação do Chatwoot
    const payload = {
      webhook_url: n8nWebhookUrl,
      subscriptions: ["message_created"] // Evento: Message created
    };
    
    console.log("[Chatwoot] Payload:", JSON.stringify(payload, null, 2));
    
    const response = await chatwootApi.post(`/accounts/${accountId}/webhooks`, payload);
    
    console.log("[Chatwoot] Resposta completa:", JSON.stringify(response.data, null, 2));
    console.log("[Chatwoot] ✅ Webhook criado com sucesso:", {
      id: response.data.id || response.data.webhook?.id,
      url: response.data.webhook_url || response.data.webhook?.webhook_url || n8nWebhookUrl,
      subscriptions: response.data.subscriptions || response.data.webhook?.subscriptions
    });

    const webhookId = response.data.id || response.data.webhook?.id;
    const webhookUrl = response.data.webhook_url || response.data.webhook?.webhook_url || n8nWebhookUrl;
    
    if (!webhookId) {
      console.warn("[Chatwoot] ⚠️ Webhook criado mas ID não retornado. Resposta:", response.data);
    }

    return {
      webhookId: webhookId || 0,
      webhookUrl: webhookUrl
    };
  } catch (error: any) {
    console.error("[Chatwoot] ❌ Erro detalhado ao criar webhook:");
    console.error("  - Status:", error.response?.status);
    console.error("  - Status Text:", error.response?.statusText);
    console.error("  - Data:", JSON.stringify(error.response?.data, null, 2));
    console.error("  - Message:", error.message);
    console.error("  - Stack:", error.stack);
    
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(`Falha ao criar webhook Chatwoot: ${errorMessage}`);
  }
}

/**
 * Deleta webhook do Chatwoot
 */
export async function deleteChatwootWebhook(webhookId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.delete(`/accounts/${accountId}/webhooks/${webhookId}`);
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao deletar webhook:", error.response?.data || error.message);
    // Não lançar erro - webhook pode não existir
  }
}
