import axios from "axios";
import { ENV } from "./_core/env";

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL || "",
  headers: {
    "apikey": process.env.EVOLUTION_API_KEY || ""
  },
  timeout: 30000, // 30 segundos
});

export interface EvolutionInstance {
  instanceName: string;
  apiKey: string;
  webhookUrl: string;
}

/**
 * Cria uma nova instância Evolution API para um tenant
 * Integra automaticamente com Chatwoot
 */
export async function createEvolutionInstance(tenantId: number, tenantName?: string): Promise<EvolutionInstance> {
  const instanceName = `tenant_${tenantId}`;
  // Usar o nome do tenant se fornecido, caso contrário usar "Tenant X"
  const inboxName = tenantName || `Tenant ${tenantId}`;
  
  if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
    throw new Error("EVOLUTION_API_URL e EVOLUTION_API_KEY devem estar configurados no .env");
  }
  
  try {
    const response = await evolutionApi.post("/instance/create", {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      // Integração automática com Chatwoot (usa camelCase conforme documentação)
      chatwootAccountId: process.env.CHATWOOT_ACCOUNT_ID || "1",
      chatwootToken: process.env.CHATWOOT_API_TOKEN,
      chatwootUrl: process.env.CHATWOOT_URL,
      chatwootSignMsg: true,
      chatwootReopenConversation: true,
      chatwootConversationPending: false,
      chatwootImportContacts: true,
      chatwootNameInbox: inboxName,
      // Configurações de comportamento
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false
      // WEBHOOK REMOVIDO - configurado no Chatwoot conforme arquitetura do usuário
    });

    console.log("[Evolution] Resposta da API:", JSON.stringify(response.data, null, 2));
    
    return {
      instanceName: response.data.instance.instanceName,
      apiKey: response.data.hash || "", // hash é retornado como string diretamente
      webhookUrl: "" // Webhook configurado no Chatwoot, não na Evolution
    };
  } catch (error: any) {
    console.error("[Evolution] Erro ao criar instância:", JSON.stringify(error.response?.data, null, 2));
    throw new Error(`Falha ao criar instância Evolution: ${JSON.stringify(error.response?.data)}`);
  }
}

/**
 * Gera QR Code para conectar WhatsApp
 * Tenta múltiplos endpoints da Evolution API
 */
export async function generateQRCode(instanceName: string): Promise<string> {
  // Primeiro, tentar iniciar a instância (se necessário)
  await startInstance(instanceName);
  
  const endpoints = [
    `/instance/connect/${instanceName}`,
    `/instance/qrcode/${instanceName}`,
    `/qrcode/${instanceName}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await evolutionApi.get(endpoint);
      
      // Log da resposta completa para debug (apenas no primeiro endpoint)
      if (endpoint === endpoints[0]) {
        console.log(`[Evolution] Resposta do endpoint ${endpoint}:`, JSON.stringify(response.data, null, 2));
      }
      
      const data = response.data;
      
      // Se a instância já estiver conectada, não há QR Code
      // Mas vamos tentar outros endpoints primeiro antes de lançar erro
      if (data?.instance?.state === "open" || data?.state === "open") {
        // Se for o último endpoint, lançar erro
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw new Error("Instância já está conectada. Não é necessário QR Code.");
        }
        // Caso contrário, continuar tentando outros endpoints
        continue;
      }
      
      // Formato 1: data.qrcode.base64
      if (data?.qrcode?.base64) {
        return data.qrcode.base64;
      }
      
      // Formato 2: data.base64
      if (data?.base64) {
        return data.base64;
      }
      
      // Formato 3: data.qrcode (string direta)
      if (data?.qrcode && typeof data.qrcode === 'string') {
        // Se for URL, converter para base64 ou retornar como está
        if (data.qrcode.startsWith('data:image')) {
          return data.qrcode;
        }
        // Se for base64 puro, adicionar prefixo
        if (!data.qrcode.startsWith('data:')) {
          return `data:image/png;base64,${data.qrcode}`;
        }
        return data.qrcode;
      }
      
      // Formato 4: data.code (algumas versões da Evolution)
      if (data?.code) {
        return data.code.startsWith('data:') ? data.code : `data:image/png;base64,${data.code}`;
      }
      
      // Formato 5: data.qrcode.data (algumas versões)
      if (data?.qrcode?.data) {
        return data.qrcode.data.startsWith('data:') ? data.qrcode.data : `data:image/png;base64,${data.qrcode.data}`;
      }
      
      // Formato 6: Resposta direta como string base64
      if (typeof data === 'string' && data.length > 100) {
        return data.startsWith('data:') ? data : `data:image/png;base64,${data}`;
      }
      
    } catch (error: any) {
      // Se não for o último endpoint, continuar tentando
      if (endpoint !== endpoints[endpoints.length - 1]) {
        console.log(`[Evolution] Endpoint ${endpoint} falhou, tentando próximo...`);
        continue;
      }
      
      // Se for o último endpoint, lançar erro
      console.error("[Evolution] Erro ao gerar QR Code:", error.response?.data || error.message);
      throw new Error(`Falha ao gerar QR Code: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Se nenhum endpoint funcionou
  throw new Error(`Nenhum endpoint da Evolution API retornou QR Code válido para ${instanceName}`);
}

/**
 * Verifica status da conexão WhatsApp
 */
export async function getConnectionStatus(instanceName: string): Promise<string> {
  try {
    const response = await evolutionApi.get(`/instance/connectionState/${instanceName}`);
    
    // Log para debug
    console.log(`[Evolution] Status response para ${instanceName}:`, JSON.stringify(response.data, null, 2));
    
    const data = response.data;
    
    // Tentar diferentes formatos de resposta
    // Formato 1: data.instance.state (formato mais comum da Evolution API)
    if (data?.instance?.state) {
      return data.instance.state;
    }
    
    // Formato 2: data.state (formato direto)
    if (data?.state) {
      return data.state;
    }
    
    // Formato 3: data.status
    if (data?.status) {
      return data.status;
    }
    
    // Formato 4: data.connectionState
    if (data?.connectionState) {
      return data.connectionState;
    }
    
    // Se não encontrar, retornar "close" como padrão
    console.warn(`[Evolution] Formato de status desconhecido para ${instanceName}:`, JSON.stringify(data));
    return "close";
  } catch (error: any) {
    console.error("[Evolution] Erro ao verificar status:", error.response?.data || error.message);
    return "close";
  }
}

/**
 * Inicia uma instância Evolution (se necessário)
 */
export async function startInstance(instanceName: string): Promise<void> {
  try {
    await evolutionApi.post(`/instance/start/${instanceName}`);
    console.log(`[Evolution] Instância ${instanceName} iniciada`);
  } catch (error: any) {
    // Se a instância já estiver iniciada, não é erro
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already')) {
      console.log(`[Evolution] Instância ${instanceName} já está iniciada`);
      return;
    }
    console.warn(`[Evolution] Aviso ao iniciar instância ${instanceName}:`, error.response?.data || error.message);
    // Não lançar erro, apenas logar
  }
}

/**
 * Deleta instância Evolution
 */
export async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  try {
    await evolutionApi.delete(`/instance/delete/${instanceName}`);
  } catch (error: any) {
    console.error("[Evolution] Erro ao deletar instância:", error.response?.data || error.message);
    throw new Error(`Falha ao deletar instância Evolution: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Desconecta WhatsApp (logout)
 */
export async function logoutInstance(instanceName: string): Promise<void> {
  try {
    await evolutionApi.delete(`/instance/logout/${instanceName}`);
  } catch (error: any) {
    console.error("[Evolution] Erro ao fazer logout:", error.response?.data || error.message);
    throw new Error(`Falha ao fazer logout: ${error.response?.data?.message || error.message}`);
  }
}
