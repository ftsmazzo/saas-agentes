import axios from "axios";

const n8nApi = axios.create({
  baseURL: `${process.env.N8N_API_URL || ""}/api/v1`,
  headers: {
    "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
  },
  timeout: 30000, // 30 segundos
});

export interface WorkflowInfo {
  workflowId: string;
  webhookUrl: string;
}

/**
 * Clona workflow template para um tenant específico
 */
export async function cloneWorkflowForTenant(
  tenantId: number,
  tenantName: string,
  evolutionInstanceName: string
): Promise<WorkflowInfo> {
  if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY || !process.env.N8N_TEMPLATE_WORKFLOW_ID) {
    throw new Error("N8N_API_URL, N8N_API_KEY e N8N_TEMPLATE_WORKFLOW_ID devem estar configurados no .env");
  }
  
  try {
    const templateId = process.env.N8N_TEMPLATE_WORKFLOW_ID;
    console.log("[N8N] Buscando workflow template:", templateId);
    const templateResponse = await n8nApi.get(`/workflows/${templateId}`);
    console.log("[N8N] Resposta da API:", JSON.stringify(templateResponse.data, null, 2).substring(0, 500));
    const template = templateResponse.data.data || templateResponse.data;

    const modifiedWorkflow = {
      name: `${tenantName} - Agente`,
      nodes: template.nodes.map((node: any) => {
        if (node.type === 'n8n-nodes-base.webhook') {
          return {
            ...node,
            parameters: {
              ...node.parameters,
              path: `/webhook/tenant_${tenantId}`
            }
          };
        }

        if (node.type === 'n8n-nodes-base.mysql') {
          const query = node.parameters.query || node.parameters.operation;
          if (typeof query === 'string') {
            return {
              ...node,
              parameters: {
                ...node.parameters,
                query: injectTenantIdInQuery(query, tenantId)
              }
            };
          }
        }

        if (node.type === 'n8n-nodes-base.code' && node.parameters.jsCode) {
          let code = node.parameters.jsCode;
          code = code.replace(/instanceName\s*=\s*['"].*?['"]/g, `instanceName = "${evolutionInstanceName}"`);
          return {
            ...node,
            parameters: {
              ...node.parameters,
              jsCode: code
            }
          };
        }

        return node;
      }),
      connections: template.connections || {},
      settings: template.settings || {},
      staticData: template.staticData || null
    };

    const createResponse = await n8nApi.post("/workflows", modifiedWorkflow);
    console.log("[N8N] Workflow criado:", JSON.stringify(createResponse.data, null, 2).substring(0, 300));
    const newWorkflowId = createResponse.data.id || createResponse.data.data?.id;

    // Ativar workflow usando POST conforme documentação oficial
    await n8nApi.post(`/workflows/${newWorkflowId}/activate`);

    return {
      workflowId: newWorkflowId,
      webhookUrl: `${process.env.N8N_API_URL}/webhook/tenant_${tenantId}`
    };
  } catch (error: any) {
    console.error("[N8N] Erro ao clonar workflow:", error.response?.data || error.message);
    throw new Error(`Falha ao clonar workflow: ${error.response?.data?.message || error.message}`);
  }
}

function injectTenantIdInQuery(query: string, tenantId: number): string {
  if (query.toUpperCase().includes("WHERE")) {
    return query.replace(/WHERE/i, `WHERE tenant_id = ${tenantId} AND`);
  } else if (query.toUpperCase().includes("FROM")) {
    return query.replace(/FROM\s+(\w+)/i, `FROM $1 WHERE tenant_id = ${tenantId}`);
  } else if (query.toUpperCase().includes("INSERT INTO")) {
    return query.replace(/\(([^)]+)\)/i, `($1, tenant_id)`).replace(/VALUES\s*\(([^)]+)\)/i, `VALUES ($1, ${tenantId})`);
  } else if (query.toUpperCase().includes("UPDATE")) {
    if (!query.toUpperCase().includes("WHERE")) {
      return `${query} WHERE tenant_id = ${tenantId}`;
    } else {
      return query.replace(/WHERE/i, `WHERE tenant_id = ${tenantId} AND`);
    }
  }
  return query;
}

export async function activateWorkflow(workflowId: string): Promise<void> {
  try {
    await n8nApi.patch(`/workflows/${workflowId}`, { active: true });
  } catch (error: any) {
    console.error("[N8N] Erro ao ativar workflow:", error.response?.data || error.message);
    throw new Error(`Falha ao ativar workflow: ${error.response?.data?.message || error.message}`);
  }
}

export async function deactivateWorkflow(workflowId: string): Promise<void> {
  try {
    await n8nApi.patch(`/workflows/${workflowId}`, { active: false });
  } catch (error: any) {
    console.error("[N8N] Erro ao desativar workflow:", error.response?.data || error.message);
    throw new Error(`Falha ao desativar workflow: ${error.response?.data?.message || error.message}`);
  }
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  try {
    await n8nApi.delete(`/workflows/${workflowId}`);
  } catch (error: any) {
    console.error("[N8N] Erro ao deletar workflow:", error.response?.data || error.message);
    throw new Error(`Falha ao deletar workflow: ${error.response?.data?.message || error.message}`);
  }
}

export async function getWorkflowExecutionStats(workflowId: string): Promise<any> {
  try {
    const response = await n8nApi.get(`/executions`, {
      params: {
        workflowId,
        limit: 100
      }
    });
    return response.data.data;
  } catch (error: any) {
    console.error("[N8N] Erro ao buscar estatísticas:", error.response?.data || error.message);
    return [];
  }
}

/**
 * Sincroniza configuração do agente para o workflow N8N
 * Envia atualizações via webhook do workflow
 */
export async function syncAgentConfigToN8N(
  workflowId: string,
  tenantId: number,
  config: {
    systemPrompt?: string;
    welcomeMessage?: string;
    companyInfo?: string;
    toolsConfig?: string; // JSON string
    schedulingConfig?: string; // JSON string
    ragConfig?: string; // JSON string
    enableHumanHandoff?: boolean;
    enableAudioTranscription?: boolean;
    enableImageProcessing?: boolean;
  }
): Promise<boolean> {
  if (!process.env.N8N_API_URL) {
    console.warn("[N8N] N8N_API_URL não configurado. Pulando sincronização.");
    return false;
  }

  try {
    // URL do webhook do workflow para receber atualizações de configuração
    // O workflow precisa ter um webhook configurado para receber essas atualizações
    const configWebhookUrl = `${process.env.N8N_API_URL}/webhook/config/tenant_${tenantId}`;
    
    const payload = {
      action: "update_config",
      tenantId,
      config: {
        systemPrompt: config.systemPrompt,
        welcomeMessage: config.welcomeMessage,
        companyInfo: config.companyInfo,
        tools: config.toolsConfig ? JSON.parse(config.toolsConfig) : null,
        scheduling: config.schedulingConfig ? JSON.parse(config.schedulingConfig) : null,
        rag: config.ragConfig ? JSON.parse(config.ragConfig) : null,
        features: {
          enableHumanHandoff: config.enableHumanHandoff,
          enableAudioTranscription: config.enableAudioTranscription,
          enableImageProcessing: config.enableImageProcessing,
        },
      },
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(configWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`[N8N] ✅ Configuração sincronizada para workflow ${workflowId}`);
    return response.status === 200;
  } catch (error: any) {
    console.warn(`[N8N] ⚠️ Erro ao sincronizar configuração (não bloqueia):`, error.message);
    // Não lançar erro - sincronização é opcional
    return false;
  }
}

/**
 * Atualiza workflow via API N8N (método alternativo)
 * Modifica nodes diretamente no workflow
 */
export async function updateWorkflowConfig(
  workflowId: string,
  config: {
    systemPrompt?: string;
    welcomeMessage?: string;
    toolsConfig?: any;
  }
): Promise<boolean> {
  try {
    // Buscar workflow atual
    const workflowResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = workflowResponse.data.data || workflowResponse.data;

    // Modificar nodes com novas configurações
    const updatedNodes = workflow.nodes.map((node: any) => {
      // Atualizar prompt do sistema no node Supervisor
      if (node.name === 'Supervisor' && node.type === '@n8n/n8n-nodes-langchain.agent') {
        if (config.systemPrompt && node.parameters?.text) {
          // Substituir apenas a parte do prompt, mantendo estrutura
          const currentText = node.parameters.text;
          // Encontrar onde começa o prompt (após "systemMessage": "=)
          const promptMatch = currentText.match(/systemMessage["\s]*:["\s]*["']?=([^"']+)/);
          if (promptMatch) {
            node.parameters.text = currentText.replace(
              promptMatch[0],
              `systemMessage": "=${config.systemPrompt}`
            );
          } else {
            // Se não encontrar, adicionar no início
            node.parameters.text = `systemMessage": "=${config.systemPrompt}\n\n${currentText}`;
          }
        }
      }

      // Atualizar tools baseado em toolsConfig
      if (config.toolsConfig) {
        // Lógica para habilitar/desabilitar nodes de tools
        // Isso depende da estrutura específica do workflow
      }

      return node;
    });

    // Atualizar workflow
    await n8nApi.put(`/workflows/${workflowId}`, {
      ...workflow,
      nodes: updatedNodes,
    });

    console.log(`[N8N] ✅ Workflow ${workflowId} atualizado via API`);
    return true;
  } catch (error: any) {
    console.error("[N8N] Erro ao atualizar workflow:", error.response?.data || error.message);
    return false;
  }
}
