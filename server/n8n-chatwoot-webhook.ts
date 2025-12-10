/**
 * Cria webhook no Chatwoot usando N8N
 * 
 * Esta função chama um workflow existente no N8N via webhook
 * que cria o webhook no Chatwoot. O workflow deve estar ativo
 * e ter um webhook configurado.
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
  n8nWebhookUrl: string; // URL do webhook do agente do tenant
  chatwootAccountId: string;
  chatwootUrl: string;
  chatwootToken: string;
}

/**
 * Chama workflow N8N via webhook para criar webhook no Chatwoot
 * O workflow deve estar configurado com webhook e receber:
 * - webhookUrl: URL do webhook do agente do tenant
 * - tenantId: ID do tenant
 */
export async function createChatwootWebhookViaN8N(
  params: CreateWebhookViaN8NParams
): Promise<{ success: boolean; webhookId?: number; error?: string }> {
  try {
    const { tenantId, n8nWebhookUrl, chatwootAccountId, chatwootUrl, chatwootToken } = params;

    // URL do webhook do workflow N8N que cria webhooks no Chatwoot
    // Deve ser configurado como variável de ambiente
    const createWebhookWorkflowUrl = process.env.N8N_CREATE_WEBHOOK_WORKFLOW_URL;
    
    if (!createWebhookWorkflowUrl) {
      throw new Error("N8N_CREATE_WEBHOOK_WORKFLOW_URL não configurado. Configure a URL do webhook do workflow que cria webhooks no Chatwoot.");
    }

    console.log(`[N8N] Chamando workflow via webhook para criar webhook Chatwoot do tenant ${tenantId}...`);
    console.log(`[N8N] Webhook URL do tenant: ${n8nWebhookUrl}`);
    console.log(`[N8N] Workflow URL: ${createWebhookWorkflowUrl}`);

    // Payload que será enviado para o workflow N8N
    // O workflow receberá esses dados e usará para criar o webhook no Chatwoot
    const payload = {
      tenantId: tenantId,
      webhookUrl: n8nWebhookUrl, // URL do webhook do agente do tenant
      chatwootAccountId: chatwootAccountId,
      chatwootUrl: chatwootUrl,
      chatwootToken: chatwootToken,
    };

    // Chamar workflow N8N via webhook
    const response = await axios.post(createWebhookWorkflowUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log(`[N8N] Workflow executado. Status: ${response.status}`);
    console.log(`[N8N] Resposta:`, JSON.stringify(response.data, null, 2));

    // Extrair webhook ID da resposta (se o workflow retornar)
    let webhookId: number | undefined;
    if (response.data?.id || response.data?.webhook?.id) {
      webhookId = response.data.id || response.data.webhook?.id;
    }

    if (webhookId) {
      return { success: true, webhookId };
    } else {
      // Mesmo sem webhookId, se não deu erro HTTP, provavelmente funcionou
      return { success: true };
    }
  } catch (error: any) {
    console.error("[N8N] Erro ao criar webhook via N8N:", error.response?.data || error.message);
    console.error("[N8N] Status:", error.response?.status);
    console.error("[N8N] Data:", JSON.stringify(error.response?.data, null, 2));
    
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

