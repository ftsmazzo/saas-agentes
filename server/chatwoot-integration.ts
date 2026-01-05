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
    const endpoint = `/accounts/${accountId}/webhooks`;
    
    console.log(`[Chatwoot] 🔍 Buscando webhooks no endpoint: ${endpoint}`);
    console.log(`[Chatwoot] 🔍 Account ID: ${accountId}`);
    console.log(`[Chatwoot] 🔍 Base URL: ${process.env.CHATWOOT_URL}`);
    
    const response = await chatwootApi.get(endpoint);
    
    // Log completo da resposta para debug
    console.log("[Chatwoot] 📦 Resposta completa da API:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.keys(response.headers),
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataKeys: response.data ? Object.keys(response.data) : [],
      dataPreview: JSON.stringify(response.data).substring(0, 1000), // Primeiros 1000 caracteres
    });
    
    // A API do Chatwoot pode retornar em diferentes formatos
    let webhooks: any[] = [];
    
    // Estrutura real: response.data.payload.webhooks (conforme log)
    if (response.data?.payload?.webhooks && Array.isArray(response.data.payload.webhooks)) {
      webhooks = response.data.payload.webhooks;
      console.log("[Chatwoot] ✅ Webhooks encontrados em response.data.payload.webhooks");
    } else if (Array.isArray(response.data)) {
      webhooks = response.data;
      console.log("[Chatwoot] ✅ Resposta é um array direto");
    } else if (response.data?.payload && Array.isArray(response.data.payload)) {
      webhooks = response.data.payload;
      console.log("[Chatwoot] ✅ Webhooks encontrados em response.data.payload");
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      webhooks = response.data.data;
      console.log("[Chatwoot] ✅ Webhooks encontrados em response.data.data");
    } else if (response.data?.webhooks && Array.isArray(response.data.webhooks)) {
      webhooks = response.data.webhooks;
      console.log("[Chatwoot] ✅ Webhooks encontrados em response.data.webhooks");
    } else {
      // Tentar outros formatos possíveis
      if (response.data?.results && Array.isArray(response.data.results)) {
        webhooks = response.data.results;
        console.log("[Chatwoot] ✅ Webhooks encontrados em response.data.results");
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        webhooks = response.data.items;
        console.log("[Chatwoot] ✅ Webhooks encontrados em response.data.items");
      }
    }
    
    // Garantir que sempre retornamos um array
    if (!Array.isArray(webhooks)) {
      console.warn("[Chatwoot] ⚠️ Resposta de webhooks não é um array. Estrutura completa:", JSON.stringify(response.data).substring(0, 1000));
      return [];
    }
    
    console.log(`[Chatwoot] ✅ ${webhooks.length} webhook(s) encontrado(s)`);
    if (webhooks.length > 0) {
      // Log do primeiro webhook para ver a estrutura
      console.log("[Chatwoot] 📋 Exemplo de webhook (primeiro):", JSON.stringify(webhooks[0], null, 2));
    } else {
      console.warn("[Chatwoot] ⚠️ Nenhum webhook encontrado na resposta. Verifique se há webhooks criados no Chatwoot.");
    }
    
    return webhooks;
  } catch (error: any) {
    console.error("[Chatwoot] ❌ Erro ao listar webhooks:");
    console.error("[Chatwoot] Status:", error.response?.status);
    console.error("[Chatwoot] Status Text:", error.response?.statusText);
    console.error("[Chatwoot] Response Data:", JSON.stringify(error.response?.data || error.message).substring(0, 500));
    console.error("[Chatwoot] URL chamada:", error.config?.url);
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

// ========== AGENT BOTS (ROBÔS) ==========

/**
 * Lista todos os agent bots de uma conta Chatwoot
 */
export async function listChatwootAgentBots(): Promise<any[]> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const response = await chatwootApi.get(`/accounts/${accountId}/agent_bots`);
    
    // A API pode retornar em diferentes formatos
    let bots: any[] = [];
    
    if (Array.isArray(response.data)) {
      bots = response.data;
    } else if (response.data?.payload && Array.isArray(response.data.payload)) {
      bots = response.data.payload;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      bots = response.data.data;
    } else if (response.data?.agent_bots && Array.isArray(response.data.agent_bots)) {
      bots = response.data.agent_bots;
    }
    
    if (!Array.isArray(bots)) {
      console.warn("[Chatwoot] Resposta de agent bots não é um array:", JSON.stringify(response.data).substring(0, 200));
      return [];
    }
    
    return bots;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao listar agent bots:", error.response?.data || error.message);
    return [];
  }
}

/**
 * Busca agent bot pelo nome
 */
export async function findChatwootAgentBotByName(botName: string): Promise<number | null> {
  try {
    const bots = await listChatwootAgentBots();
    const bot = bots.find((b: any) => 
      b.name === botName || 
      b.name?.toLowerCase().includes(botName.toLowerCase()) ||
      botName.toLowerCase().includes(b.name?.toLowerCase() || '')
    );
    return bot ? bot.id : null;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar agent bot por nome:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Interface para retornar dados do Agent Bot criado
 */
export interface ChatwootAgentBot {
  id: number;
  token: string;
}

/**
 * Cria ou atualiza um agent bot no Chatwoot
 * Se o bot já existir (pelo nome), atualiza. Caso contrário, cria novo.
 * Retorna o ID e o token de acesso do bot.
 */
export async function createOrUpdateChatwootAgentBot(
  botName: string,
  webhookUrl: string,
  description?: string
): Promise<ChatwootAgentBot> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    // Verificar se já existe um bot com esse nome
    const existingBotId = await findChatwootAgentBotByName(botName);
    
    const botData: any = {
      name: botName,
      description: description || `Agent bot para ${botName}`,
    };
    
    // Tentar diferentes campos possíveis para a URL do webhook
    // A API pode usar: outgoing_url, webhook_url, url, etc.
    botData.outgoing_url = webhookUrl;
    botData.webhook_url = webhookUrl;
    botData.url = webhookUrl;
    
    if (existingBotId) {
      // Atualizar bot existente
      console.log(`[Chatwoot] 🔄 Atualizando agent bot existente: ${botName} (ID: ${existingBotId})`);
      const response = await chatwootApi.put(`/accounts/${accountId}/agent_bots/${existingBotId}`, botData);
      
      const botId = response.data.id || existingBotId;
      
      // Buscar o token usando a mesma lógica robusta
      let token = '';
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const botResponse = await chatwootApi.get(`/accounts/${accountId}/agent_bots/${existingBotId}`);
        const bot = botResponse.data.payload || botResponse.data.data || botResponse.data;
        
        console.log(`[Chatwoot] 📋 Detalhes do bot atualizado:`, JSON.stringify(bot, null, 2));
        
        const possibleTokenFields = [
          'access_token', 'token', 'accessToken', 'access_token_key',
          'api_access_token', 'outgoing_url_token', 'accessTokenKey',
          'apiToken', 'bot_token', 'botToken'
        ];
        
        for (const field of possibleTokenFields) {
          if (bot[field]) {
            token = bot[field];
            console.log(`[Chatwoot] ✅ Token encontrado no campo: ${field}`);
            break;
          }
        }
      } catch (error: any) {
        console.warn(`[Chatwoot] ⚠️ Erro ao buscar token do bot atualizado:`, error.message);
      }
      
      console.log(`[Chatwoot] ✅ Agent bot atualizado: ${botId}`);
      console.log(`[Chatwoot] 📋 Token do bot: ${token ? '***' + token.slice(-4) : 'NÃO ENCONTRADO'}`);
      
      return { id: botId, token };
    } else {
      // Criar novo bot
      console.log(`[Chatwoot] ➕ Criando novo agent bot: ${botName}`);
      const response = await chatwootApi.post(`/accounts/${accountId}/agent_bots`, botData);
      
      // A resposta pode conter o token diretamente ou precisamos buscar
      // Verificar primeiro response.data diretamente (pode vir no nível raiz)
      const botData_response = response.data.payload || response.data.data || response.data;
      const botId = botData_response.id || response.data.id;
      
      console.log(`[Chatwoot] 📋 Resposta completa da criação:`, JSON.stringify(botData_response, null, 2));
      console.log(`[Chatwoot] 📋 Response.data completo:`, JSON.stringify(response.data, null, 2));
      
      // Buscar o token do bot recém-criado
      // O token pode não vir na resposta de criação, então vamos buscar de várias formas
      let token = '';
      if (botId) {
        try {
          // 1. Tentar pegar da resposta original (pode vir em diferentes formatos)
          // Verificar primeiro em response.data diretamente (nível raiz)
          const possibleTokenFields = [
            'access_token',
            'token',
            'accessToken',
            'access_token_key',
            'api_access_token',
            'outgoing_url_token',
            'accessTokenKey',
            'apiToken',
            'bot_token',
            'botToken'
          ];
          
          // Primeiro tentar em response.data (nível raiz)
          for (const field of possibleTokenFields) {
            if (response.data[field]) {
              token = response.data[field];
              console.log(`[Chatwoot] ✅ Token encontrado em response.data no campo: ${field}`);
              break;
            }
          }
          
          // Se não encontrou, tentar em botData_response
          if (!token) {
            for (const field of possibleTokenFields) {
              if (botData_response[field]) {
                token = botData_response[field];
                console.log(`[Chatwoot] ✅ Token encontrado na resposta de criação no campo: ${field}`);
                break;
              }
            }
          }
          
          // 2. Se não encontrou, buscar detalhes completos do bot via GET
          if (!token) {
            console.log(`[Chatwoot] 🔍 Token não encontrado na resposta de criação. Buscando detalhes completos do bot ${botId}...`);
            
            // Aguardar um pouco para garantir que o bot foi totalmente criado
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const botResponse = await chatwootApi.get(`/accounts/${accountId}/agent_bots/${botId}`);
            const botDetails = botResponse.data.payload || botResponse.data.data || botResponse.data;
            
            console.log(`[Chatwoot] 📋 Detalhes completos do bot (GET):`, JSON.stringify(botDetails, null, 2));
            
            // Tentar todos os campos possíveis
            for (const field of possibleTokenFields) {
              if (botDetails[field]) {
                token = botDetails[field];
                console.log(`[Chatwoot] ✅ Token encontrado nos detalhes no campo: ${field}`);
                break;
              }
            }
          }
          
          // 3. Se ainda não encontrou, listar todos os bots e buscar pelo ID
          if (!token) {
            console.log(`[Chatwoot] 🔍 Token ainda não encontrado. Listando todos os bots para buscar pelo ID ${botId}...`);
            const allBots = await listChatwootAgentBots();
            const foundBot = allBots.find((b: any) => b.id === botId || b.id === Number(botId));
            
            if (foundBot) {
              console.log(`[Chatwoot] 📋 Bot encontrado na listagem:`, JSON.stringify(foundBot, null, 2));
              
              for (const field of possibleTokenFields) {
                if (foundBot[field]) {
                  token = foundBot[field];
                  console.log(`[Chatwoot] ✅ Token encontrado na listagem no campo: ${field}`);
                  break;
                }
              }
            }
          }
        } catch (getError: any) {
          console.error(`[Chatwoot] ❌ Erro ao buscar token do bot:`, getError.response?.data || getError.message);
          console.error(`[Chatwoot] Stack trace:`, getError.stack);
        }
      }
      
      console.log(`[Chatwoot] ✅ Agent bot criado: ${botId}`);
      console.log(`[Chatwoot] 📋 Token do bot: ${token ? '***' + token.slice(-4) : 'NÃO ENCONTRADO'}`);
      
      if (!token) {
        console.warn(`[Chatwoot] ⚠️ ATENÇÃO: Token do Agent Bot não foi encontrado. O bot pode precisar ser configurado manualmente.`);
      }
      
      return { id: botId, token };
    }
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao criar/atualizar agent bot:", error.response?.data || error.message);
    console.error("[Chatwoot] Dados enviados:", JSON.stringify({ name: botName, webhookUrl }).substring(0, 200));
    throw new Error(`Falha ao criar/atualizar agent bot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Conecta um agent bot a um inbox
 */
export async function connectAgentBotToInbox(inboxId: number, agentBotId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.post(`/accounts/${accountId}/inboxes/${inboxId}/agent_bot`, {
      agent_bot_id: agentBotId,
    });
    console.log(`[Chatwoot] ✅ Agent bot ${agentBotId} conectado ao inbox ${inboxId}`);
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao conectar agent bot ao inbox:", error.response?.data || error.message);
    throw new Error(`Falha ao conectar agent bot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Desconecta agent bot de um inbox
 */
export async function disconnectAgentBotFromInbox(inboxId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.delete(`/accounts/${accountId}/inboxes/${inboxId}/agent_bot`);
    console.log(`[Chatwoot] ✅ Agent bot desconectado do inbox ${inboxId}`);
  } catch (error: any) {
    // Se não houver bot conectado, não é erro crítico
    if (error.response?.status === 404) {
      console.log(`[Chatwoot] ⚠️ Nenhum agent bot conectado ao inbox ${inboxId}`);
      return;
    }
    console.error("[Chatwoot] Erro ao desconectar agent bot:", error.response?.data || error.message);
    throw new Error(`Falha ao desconectar agent bot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Deleta agent bot do Chatwoot
 */
export async function deleteChatwootAgentBot(agentBotId: number): Promise<void> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    await chatwootApi.delete(`/accounts/${accountId}/agent_bots/${agentBotId}`);
    console.log(`[Chatwoot] ✅ Agent bot ${agentBotId} deletado`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`[Chatwoot] ⚠️ Agent bot ${agentBotId} já não existe (404)`);
      return;
    }
    console.error("[Chatwoot] Erro ao deletar agent bot:", error.response?.data || error.message);
    throw new Error(`Falha ao deletar agent bot: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Deleta agent bot pelo nome (usado para deletar bot criado para um tenant)
 */
export async function deleteChatwootAgentBotByName(botName: string): Promise<boolean> {
  try {
    const botId = await findChatwootAgentBotByName(botName);
    if (botId) {
      await deleteChatwootAgentBot(botId);
      return true;
    }
    console.log(`[Chatwoot] ⚠️ Agent bot com nome "${botName}" não encontrado`);
    return false;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao deletar agent bot por nome:", error.response?.data || error.message);
    return false;
  }
}

// ========== MENSAGENS E INTERAÇÕES ==========

/**
 * Envia uma mensagem em uma conversa do Chatwoot
 */
export async function sendChatwootMessage(
  conversationId: number,
  content: string,
  messageType: 'outgoing' | 'incoming' = 'outgoing',
  contentType: 'text' | 'input_text' = 'text'
): Promise<any> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    const response = await chatwootApi.post(
      `/accounts/${accountId}/conversations/${conversationId}/messages`,
      {
        content,
        message_type: messageType,
        private: false,
        content_type: contentType
      }
    );

    return response.data.payload || response.data;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao enviar mensagem:", error.response?.data || error.message);
    throw new Error(`Falha ao enviar mensagem: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Atualiza o status de uma conversa
 */
export async function updateConversationStatus(
  conversationId: number,
  status: 'open' | 'resolved' | 'pending'
): Promise<any> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    const response = await chatwootApi.put(
      `/accounts/${accountId}/conversations/${conversationId}`,
      { status }
    );

    return response.data.payload || response.data;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao atualizar status da conversa:", error.response?.data || error.message);
    throw new Error(`Falha ao atualizar status: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Busca detalhes completos de uma conversa
 */
export async function getConversationDetails(conversationId: number): Promise<any> {
  try {
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    
    const response = await chatwootApi.get(
      `/accounts/${accountId}/conversations/${conversationId}`
    );

    return response.data.payload || response.data;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar detalhes da conversa:", error.response?.data || error.message);
    throw new Error(`Falha ao buscar detalhes: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Busca contato de uma conversa
 */
export async function getConversationContact(conversationId: number): Promise<any> {
  try {
    const conversation = await getConversationDetails(conversationId);
    const contactId = conversation?.meta?.sender?.id || conversation?.contact?.id;
    
    if (!contactId) {
      return null;
    }

    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const response = await chatwootApi.get(
      `/accounts/${accountId}/contacts/${contactId}`
    );

    return response.data.payload || response.data;
  } catch (error: any) {
    console.error("[Chatwoot] Erro ao buscar contato:", error.response?.data || error.message);
    return null;
  }
}