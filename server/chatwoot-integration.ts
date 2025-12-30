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
 * Lista todos os inboxes de uma conta
 */
export async function listChatwootInboxes(): Promise<any[]> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const response = await chatwootApi.get(`/accounts/${accountId}/inboxes`);
    return response.data.payload || response.data || [];
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao listar inboxes:", error.response?.data || error.message);
    return [];
  }
}

/**
 * Busca inbox pelo nome
 */
export async function findChatwootInboxByName(inboxName: string): Promise<number | null> {
  try {
    const inboxes = await listChatwootInboxes();
    const inbox = inboxes.find((i: any) => i.name === inboxName || i.name?.includes(inboxName));
    return inbox ? inbox.id : null;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar inbox por nome:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Deleta inbox Chatwoot
 */
export async function deleteChatwootInbox(inboxId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.delete(`/accounts/${accountId}/inboxes/${inboxId}`);
    console.log(`[Chatwoot] ✅ Inbox ${inboxId} deletado com sucesso`);
  } catch (error: any) {
    // Se o inbox já não existe (404), não é erro crítico
    if (error.response?.status === 404) {
      console.log(`[Chatwoot] ⚠️ Inbox ${inboxId} já não existe (404)`);
      return;
    }
    console.error("[Chatwoot] Erro ao deletar inbox:", error.response?.data || error.message);
    throw new Error(`Falha ao deletar inbox Chatwoot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Deleta inbox Chatwoot pelo nome (fallback quando não temos o ID)
 */
export async function deleteChatwootInboxByName(inboxName: string): Promise<boolean> {
  try {
    const inboxId = await findChatwootInboxByName(inboxName);
    if (inboxId) {
      await deleteChatwootInbox(inboxId);
      return true;
    }
    console.log(`[Chatwoot] ⚠️ Inbox com nome "${inboxName}" não encontrado`);
    return false;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao deletar inbox por nome:", error.response?.data || error.message);
    return false;
  }
}

/**
 * Lista todos os webhooks de uma conta Chatwoot
 */
export async function listChatwootWebhooks(): Promise<any[]> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const response = await chatwootApi.get(`/accounts/${accountId}/webhooks`);
    return response.data.payload || response.data || [];
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao listar webhooks:", error.response?.data || error.message);
    return [];
  }
}

/**
 * Busca webhook pela URL (usado para encontrar webhook criado pelo N8N)
 */
export async function findChatwootWebhookByUrl(webhookUrl: string): Promise<number | null> {
  try {
    const webhooks = await listChatwootWebhooks();
    const webhook = webhooks.find((w: any) => 
      w.webhook_url === webhookUrl || 
      w.url === webhookUrl ||
      (w.webhook_url && w.webhook_url.includes(webhookUrl)) ||
      (w.url && w.url.includes(webhookUrl))
    );
    return webhook ? webhook.id : null;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar webhook por URL:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Deleta webhook Chatwoot pelo ID
 */
export async function deleteChatwootWebhook(webhookId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.delete(`/accounts/${accountId}/webhooks/${webhookId}`);
    console.log(`[Chatwoot] ✅ Webhook ${webhookId} deletado com sucesso`);
  } catch (error: any) {
    // Se o webhook já não existe (404), não é erro crítico
    if (error.response?.status === 404) {
      console.log(`[Chatwoot] ⚠️ Webhook ${webhookId} já não existe (404)`);
      return;
    }
    console.error("[Chatwoot] Erro ao deletar webhook:", error.response?.data || error.message);
    throw new Error(`Falha ao deletar webhook Chatwoot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Deleta webhook Chatwoot pela URL (usado para deletar webhook criado pelo N8N)
 */
export async function deleteChatwootWebhookByUrl(webhookUrl: string): Promise<boolean> {
  try {
    const webhookId = await findChatwootWebhookByUrl(webhookUrl);
    if (webhookId) {
      await deleteChatwootWebhook(webhookId);
      return true;
    }
    console.log(`[Chatwoot] ⚠️ Webhook com URL "${webhookUrl}" não encontrado`);
    return false;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao deletar webhook por URL:", error.response?.data || error.message);
    return false;
  }
}
