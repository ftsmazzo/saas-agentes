import axios from "axios";

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    "apikey": process.env.EVOLUTION_API_KEY
  }
});

/**
 * Versão simplificada - cria instância SEM integração Chatwoot
 * Use esta função se o Chatwoot não estiver habilitado na Evolution API
 */
export async function createEvolutionInstanceSimple(tenantId: number) {
  const instanceName = `tenant_${tenantId}`;
  
  try {
    const response = await evolutionApi.post("/instance/create", {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      // Configurações básicas
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false
    });

    return {
      instanceName: response.data.instance.instanceName,
      apiKey: response.data.hash.apikey,
      instanceId: response.data.instance.instanceId
    };
  } catch (error: any) {
    console.error("[Evolution] Erro ao criar instância:", JSON.stringify(error.response?.data, null, 2));
    throw new Error(`Falha ao criar instância Evolution: ${JSON.stringify(error.response?.data)}`);
  }
}
