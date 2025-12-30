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
 * Busca inbox pelo nome (tenta múltiplas variações)
 */
export async function findChatwootInboxByName(inboxName: string): Promise<number | null> {
  try {
    const inboxes = await listChatwootInboxes();
    
    // Tentar busca exata primeiro
    let inbox = inboxes.find((i: any) => i.name === inboxName);
    
    // Se não encontrar, tentar busca parcial (case-insensitive)
    if (!inbox) {
      const lowerName = inboxName.toLowerCase();
      inbox = inboxes.find((i: any) => 
        i.name?.toLowerCase() === lowerName || 
        i.name?.toLowerCase().includes(lowerName) ||
        lowerName.includes(i.name?.toLowerCase() || '')
      );
    }
    
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
    
    // Log da resposta completa para debug (apenas estrutura, não dados sensíveis)
    console.log("[Chatwoot] Estrutura da resposta de webhooks:", {
      isArray: Array.isArray(response.data),
      hasPayload: !!response.data?.payload,
      hasData: !!response.data?.data,
      hasWebhooks: !!response.data?.webhooks,
      keys: response.data ? Object.keys(response.data) : [],
    });
    
    // A API do Chatwoot pode retornar em diferentes formatos
    let webhooks: any[] = [];
    
    if (Array.isArray(response.data)) {
      webhooks = response.data;
    } else if (response.data?.payload && Array.isArray(response.data.payload)) {
      webhooks = response.data.payload;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      webhooks = response.data.data;
    } else if (response.data?.webhooks && Array.isArray(response.data.webhooks)) {
      webhooks = response.data.webhooks;
    }
    
    // Garantir que sempre retornamos um array
    if (!Array.isArray(webhooks)) {
      console.warn("[Chatwoot] Resposta de webhooks não é um array. Estrutura completa:", JSON.stringify(response.data).substring(0, 500));
      return [];
    }
    
    console.log(`[Chatwoot] ✅ ${webhooks.length} webhook(s) encontrado(s)`);
    if (webhooks.length > 0) {
      // Log do primeiro webhook para ver a estrutura
      console.log("[Chatwoot] Exemplo de webhook (primeiro):", {
        id: webhooks[0].id,
        keys: Object.keys(webhooks[0]),
        hasWebhookUrl: !!webhooks[0].webhook_url,
        hasUrl: !!webhooks[0].url,
        hasEndpoint: !!webhooks[0].endpoint,
      });
    }
    
    return webhooks;
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
    
    // Garantir que webhooks é um array
    if (!Array.isArray(webhooks)) {
      console.warn("[Chatwoot] listChatwootWebhooks não retornou um array:", typeof webhooks);
      return null;
    }
    
    if (webhooks.length === 0) {
      console.log("[Chatwoot] Nenhum webhook encontrado na conta");
      return null;
    }
    
    // Normalizar a URL para comparação (remover trailing slash, etc)
    const normalizeUrl = (url: string) => {
      if (!url || typeof url !== 'string') return '';
      return url.replace(/\/$/, '').toLowerCase().trim();
    };
    const normalizedSearchUrl = normalizeUrl(webhookUrl);
    
    console.log(`[Chatwoot] 🔍 Buscando webhook com URL: ${webhookUrl}`);
    console.log(`[Chatwoot] 🔍 URL normalizada: ${normalizedSearchUrl}`);
    
    // Listar todas as URLs encontradas para debug
    const foundUrls = webhooks.map((w: any) => {
      // O webhook é criado com campo "url" no body JSON
      const urls = [
        w.url,           // Campo principal usado na criação
        w.webhook_url,   // Possível campo alternativo
        w.endpoint,      // Possível campo alternativo
        w.webhookUrl,    // Possível campo alternativo
      ].filter(Boolean);
      return { 
        id: w.id, 
        name: w.name,
        url: w.url,
        urls: urls,
        allKeys: Object.keys(w) // Para debug - ver todos os campos disponíveis
      };
    });
    console.log("[Chatwoot] 📋 URLs de webhooks encontrados:", JSON.stringify(foundUrls, null, 2));
    
    // Tentar busca exata primeiro - o campo principal é "url" (conforme criação via N8N)
    let webhook = webhooks.find((w: any) => {
      if (!w) return false;
      
      // Priorizar o campo "url" que é usado na criação
      const webhookUrl = w.url || w.webhook_url || w.endpoint || w.webhookUrl || w.webhookURL;
      if (!webhookUrl) return false;
      
      const normalizedWebhookUrl = normalizeUrl(webhookUrl);
      return normalizedWebhookUrl === normalizedSearchUrl;
    });
    
    // Se não encontrar exato, tentar busca parcial (contém)
    if (!webhook) {
      console.log("[Chatwoot] ⚠️ Busca exata não encontrou, tentando busca parcial...");
      webhook = webhooks.find((w: any) => {
        if (!w) return false;
        
        // Priorizar o campo "url" que é usado na criação
        const webhookUrl = w.url || w.webhook_url || w.endpoint || w.webhookUrl || w.webhookURL;
        if (!webhookUrl) return false;
        
        const normalizedWebhookUrl = normalizeUrl(webhookUrl);
        return normalizedWebhookUrl.includes(normalizedSearchUrl) || 
               normalizedSearchUrl.includes(normalizedWebhookUrl);
      });
    }
    
    if (webhook) {
      console.log(`[Chatwoot] ✅ Webhook encontrado! ID: ${webhook.id}`);
      return webhook.id;
    } else {
      console.log(`[Chatwoot] ❌ Webhook não encontrado com URL: ${webhookUrl}`);
      return null;
    }
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
