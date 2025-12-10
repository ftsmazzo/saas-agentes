/**
 * Cria webhook no Chatwoot usando N8N
 * 
 * Esta função cria um workflow temporário no N8N que faz uma chamada HTTP
 * para a API do Chatwoot criando o webhook. Mais confiável que fazer direto.
 */

import axios from "axios";

const n8nApi = axios.create({
  baseURL: `${process.env.N8N_API_URL || ""}/api/v1`,
  headers: {
    "X-N8N-API-KEY": process.env.N8N_API_KEY || "",
  },
  timeout: 30000,
});

export interface CreateWebhookViaN8NParams {
  tenantId: number;
  n8nWebhookUrl: string;
  chatwootAccountId: string;
  chatwootUrl: string;
  chatwootToken: string;
}

/**
 * Cria um workflow temporário no N8N que cria o webhook no Chatwoot
 */
export async function createChatwootWebhookViaN8N(
  params: CreateWebhookViaN8NParams
): Promise<{ success: boolean; webhookId?: number; error?: string }> {
  try {
    const { tenantId, n8nWebhookUrl, chatwootAccountId, chatwootUrl, chatwootToken } = params;

    // Workflow N8N que cria webhook no Chatwoot
    const workflow = {
      name: `Create Chatwoot Webhook - Tenant ${tenantId}`,
      active: true,
      nodes: [
        {
          parameters: {},
          id: "start",
          name: "Start",
          type: "n8n-nodes-base.start",
          typeVersion: 1,
          position: [250, 300],
        },
        {
          parameters: {
            method: "POST",
            url: `={{ $env.CHATWOOT_URL }}/api/v1/accounts/{{ $env.CHATWOOT_ACCOUNT_ID }}/webhooks`,
            authentication: "genericCredentialType",
            genericAuthType: "httpHeaderAuth",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "api_access_token",
                  value: `={{ $env.CHATWOOT_API_TOKEN }}`,
                },
              ],
            },
            sendBody: true,
            contentType: "json",
            bodyParameters: {
              parameters: [
                {
                  name: "webhook_url",
                  value: n8nWebhookUrl,
                },
                {
                  name: "subscriptions",
                  value: '["message_created"]',
                },
              ],
            },
            options: {},
          },
          id: "http-request",
          name: "Create Chatwoot Webhook",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [450, 300],
        },
      ],
      connections: {
        Start: {
          main: [
            [
              {
                node: "Create Chatwoot Webhook",
                type: "main",
                index: 0,
              },
            ],
          ],
        },
      },
      settings: {
        executionOrder: "v1",
      },
      staticData: null,
    };

    // Criar workflow no N8N
    console.log(`[N8N] Criando workflow para webhook Chatwoot do tenant ${tenantId}...`);
    const createResponse = await n8nApi.post("/workflows", workflow);
    const workflowId = createResponse.data.id || createResponse.data.data?.id;

    if (!workflowId) {
      throw new Error("Workflow criado mas ID não retornado");
    }

    console.log(`[N8N] Workflow criado com ID: ${workflowId}`);

    // Ativar workflow primeiro
    console.log(`[N8N] Ativando workflow ${workflowId}...`);
    await n8nApi.post(`/workflows/${workflowId}/activate`);
    
    // Executar workflow imediatamente via webhook ou trigger manual
    // Como o workflow tem nó Start, vamos usar a API de execução
    console.log(`[N8N] Executando workflow ${workflowId}...`);
    try {
      // Tentar executar via API de execução
      const executeResponse = await n8nApi.post(`/workflows/${workflowId}/execute`, {});
      console.log(`[N8N] Workflow executado. Resposta:`, JSON.stringify(executeResponse.data, null, 2));
      
      // Extrair webhook ID da resposta
      let webhookId: number | undefined;
      if (executeResponse.data?.data?.resultData?.main?.[0]?.[0]?.json) {
        const result = executeResponse.data.data.resultData.main[0][0].json;
        webhookId = result.id || result.webhook?.id;
      }
      
      // Deletar workflow temporário após execução
      try {
        await n8nApi.delete(`/workflows/${workflowId}`);
        console.log(`[N8N] Workflow temporário ${workflowId} deletado`);
      } catch (deleteError) {
        console.warn(`[N8N] Erro ao deletar workflow temporário:`, deleteError);
      }
      
      if (webhookId) {
        return { success: true, webhookId };
      } else {
        return { success: true };
      }
    } catch (executeError: any) {
      console.warn(`[N8N] Erro ao executar workflow via API, tentando método alternativo...`, executeError.message);
      // Se não conseguir executar via API, o workflow pode ser executado manualmente depois
      // Ou podemos fazer a chamada HTTP direta como fallback
      return { success: false, error: "Não foi possível executar workflow automaticamente" };
    }
  } catch (error: any) {
    console.error("[N8N] Erro ao criar webhook via N8N:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Versão simplificada: adiciona nó no workflow existente do tenant
 * para criar webhook no Chatwoot quando workflow é ativado
 */
export async function addChatwootWebhookNodeToWorkflow(
  workflowId: string,
  tenantId: number,
  n8nWebhookUrl: string
): Promise<boolean> {
  try {
    // Buscar workflow atual
    const workflowResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = workflowResponse.data;

    // Adicionar nó HTTP Request para criar webhook
    const webhookNode = {
      parameters: {
        method: "POST",
        url: `={{ $env.CHATWOOT_URL }}/api/v1/accounts/{{ $env.CHATWOOT_ACCOUNT_ID }}/webhooks`,
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "api_access_token",
              value: `={{ $env.CHATWOOT_API_TOKEN }}`,
            },
          ],
        },
        sendBody: true,
        contentType: "json",
        bodyParameters: {
          parameters: [
            {
              name: "webhook_url",
              value: n8nWebhookUrl,
            },
            {
              name: "subscriptions",
              value: '["message_created"]',
            },
          ],
        },
      },
      id: `chatwoot-webhook-${tenantId}`,
      name: "Create Chatwoot Webhook",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [650, 300],
    };

    // Adicionar nó ao workflow
    if (!workflow.nodes) {
      workflow.nodes = [];
    }
    workflow.nodes.push(webhookNode);

    // Conectar ao último nó (ou ao início)
    // Isso precisa ser ajustado conforme estrutura do workflow
    // Por enquanto, vamos apenas adicionar o nó

    // Atualizar workflow
    await n8nApi.put(`/workflows/${workflowId}`, workflow);

    console.log(`[N8N] Nó de webhook Chatwoot adicionado ao workflow ${workflowId}`);
    return true;
  } catch (error: any) {
    console.error("[N8N] Erro ao adicionar nó de webhook:", error.response?.data || error.message);
    return false;
  }
}

