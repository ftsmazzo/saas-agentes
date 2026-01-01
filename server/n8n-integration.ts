import axios from "axios";

const n8nApi = axios.create({
  baseURL: `${process.env.N8N_API_URL || ""}/api/v1`,
  headers: {
    "X-N8N-API-KEY": process.env.N8N_API_KEY || "",
    "Content-Type": "application/json"
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
          // N8N adiciona /webhook automaticamente, então usamos apenas o path sem /webhook
          return {
            ...node,
            parameters: {
              ...node.parameters,
              path: `tenant_${tenantId}`
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

    // Publicar workflow (N8N 2.1.4+)
    try {
      console.log(`[N8N] 🔄 Tentando publicar workflow ${newWorkflowId}...`);
      
      // Buscar workflow recém-criado
      const workflowResponse = await n8nApi.get(`/workflows/${newWorkflowId}`);
      const workflow = workflowResponse.data.data || workflowResponse.data;
      
      console.log(`[N8N] 📋 Workflow atual - published: ${workflow.published}, active: ${workflow.active}`);
      console.log(`[N8N] 📋 Campos disponíveis:`, Object.keys(workflow).slice(0, 10));
      
      // Tentar método 1: PUT apenas com campos permitidos (não espalhar workflow completo)
      try {
        // N8N 2.1.4+ pode usar 'published' ou ainda usar 'active'
        // Enviar apenas os campos que a API aceita
        const updatePayload: any = {
          name: workflow.name,
          nodes: workflow.nodes,
          connections: workflow.connections,
          settings: workflow.settings,
          staticData: workflow.staticData,
        };
        
        // Tentar published primeiro (N8N 2.1.4+)
        if (workflow.published !== undefined) {
          updatePayload.published = true;
        } else {
          // Se não tem published, usar active (versões antigas ou configuração diferente)
          updatePayload.active = true;
        }
        
        await n8nApi.put(`/workflows/${newWorkflowId}`, updatePayload);
        console.log(`[N8N] ✅ Workflow ${newWorkflowId} publicado com sucesso (método PUT)`);
      } catch (putError: any) {
        console.warn(`[N8N] ⚠️ PUT falhou, tentando método alternativo:`, putError.response?.data || putError.message);
        
        // Tentar método 2: Endpoint específico de ativação
        try {
          await n8nApi.post(`/workflows/${newWorkflowId}/activate`, {});
          console.log(`[N8N] ✅ Workflow ${newWorkflowId} publicado com sucesso (método POST /activate)`);
        } catch (postError: any) {
          console.warn(`[N8N] ⚠️ POST /activate também falhou:`, postError.response?.data || postError.message);
          throw putError; // Lançar o erro original do PUT
        }
      }
      
      // Verificar se realmente foi publicado
      const verifyResponse = await n8nApi.get(`/workflows/${newWorkflowId}`);
      const verifiedWorkflow = verifyResponse.data.data || verifyResponse.data;
      console.log(`[N8N] ✅ Verificação - published: ${verifiedWorkflow.published}, active: ${verifiedWorkflow.active}`);
      
    } catch (error: any) {
      console.error(`[N8N] ❌ ERRO ao publicar workflow ${newWorkflowId}:`, error.response?.data || error.message);
      console.error(`[N8N] ⚠️ Workflow criado mas NÃO publicado. Será necessário publicar manualmente no N8N.`);
      // Não lançar erro - workflow foi criado, apenas não foi publicado
      // A verificação na ativação do agente vai tentar publicar novamente
    }

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

/**
 * Publica workflow (N8N 2.1.4+)
 * Tenta múltiplos métodos para garantir que funcione
 */
export async function activateWorkflow(workflowId: string): Promise<void> {
  try {
    console.log(`[N8N] 🔄 Publicando workflow ${workflowId}...`);
    
    // Buscar workflow atual
    const workflowResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = workflowResponse.data.data || workflowResponse.data;
    
    console.log(`[N8N] 📋 Estado atual - published: ${workflow.published}, active: ${workflow.active}`);
    
    // Tentar método 1: PUT apenas com campos permitidos
    try {
      const updatePayload: any = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        staticData: workflow.staticData,
      };
      
      // Tentar published primeiro (N8N 2.1.4+)
      if (workflow.published !== undefined) {
        updatePayload.published = true;
      } else {
        // Se não tem published, usar active
        updatePayload.active = true;
      }
      
      await n8nApi.put(`/workflows/${workflowId}`, updatePayload);
      console.log(`[N8N] ✅ Workflow ${workflowId} publicado (método PUT)`);
      
      // Verificar se realmente foi publicado
      const verifyResponse = await n8nApi.get(`/workflows/${workflowId}`);
      const verifiedWorkflow = verifyResponse.data.data || verifyResponse.data;
      
      if (verifiedWorkflow.published === true || verifiedWorkflow.active === true) {
        console.log(`[N8N] ✅ Confirmação: Workflow ${workflowId} está publicado`);
        return;
      } else {
        console.warn(`[N8N] ⚠️ PUT executado mas workflow ainda não está publicado. Tentando método alternativo...`);
        throw new Error("PUT não publicou o workflow");
      }
    } catch (putError: any) {
      console.warn(`[N8N] ⚠️ PUT falhou, tentando POST /activate:`, putError.response?.data || putError.message);
      
      // Tentar método 2: Endpoint específico de ativação
      try {
        await n8nApi.post(`/workflows/${workflowId}/activate`, {});
        console.log(`[N8N] ✅ Workflow ${workflowId} publicado (método POST /activate)`);
        
        // Verificar novamente
        const verifyResponse = await n8nApi.get(`/workflows/${workflowId}`);
        const verifiedWorkflow = verifyResponse.data.data || verifyResponse.data;
        console.log(`[N8N] 📋 Após POST /activate - published: ${verifiedWorkflow.published}, active: ${verifiedWorkflow.active}`);
        
        return;
      } catch (postError: any) {
        console.error(`[N8N] ❌ POST /activate também falhou:`, postError.response?.data || postError.message);
        throw putError; // Lançar o erro original
      }
    }
  } catch (error: any) {
    console.error("[N8N] ❌ Erro ao publicar workflow:", error.response?.data || error.message);
    throw new Error(`Falha ao publicar workflow: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Despublica workflow (N8N 2.1.4+ - precisa atualizar workflow completo com PUT)
 * IMPORTANTE: Não incluir 'active' no payload pois é read-only no N8N 2.1.4+
 */
export async function deactivateWorkflow(workflowId: string): Promise<void> {
  try {
    // Buscar workflow atual
    const workflowResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = workflowResponse.data.data || workflowResponse.data;
    
    console.log(`[N8N] 🔄 Despublicando workflow ${workflowId}...`);
    console.log(`[N8N] 📋 Workflow atual - published: ${workflow.published}, active: ${workflow.active}`);
    
    // Enviar apenas campos permitidos (não incluir 'active' pois é read-only)
    const updatePayload: any = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    };
    
    // N8N 2.1.4+ usa 'published', não 'active' (que é read-only)
    if (workflow.published !== undefined) {
      updatePayload.published = false;
      console.log(`[N8N] 📋 Usando 'published: false' para despublicar`);
    } else {
      // Fallback para versões antigas (mas não incluir active no payload)
      console.log(`[N8N] ⚠️ Campo 'published' não encontrado, tentando método alternativo`);
      // Tentar usar endpoint de desativação se existir
      try {
        await n8nApi.post(`/workflows/${workflowId}/deactivate`, {});
        console.log(`[N8N] ✅ Workflow ${workflowId} despublicado via POST /deactivate`);
        return;
      } catch (deactivateError: any) {
        console.warn(`[N8N] ⚠️ POST /deactivate não disponível:`, deactivateError.response?.data || deactivateError.message);
        // Continuar com PUT sem active
      }
    }
    
    await n8nApi.put(`/workflows/${workflowId}`, updatePayload);
    console.log(`[N8N] ✅ Workflow ${workflowId} despublicado com sucesso (método PUT)`);
    
    // Verificar se foi despublicado
    const verifyResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const verifiedWorkflow = verifyResponse.data.data || verifyResponse.data;
    console.log(`[N8N] ✅ Verificação - published: ${verifiedWorkflow.published}, active: ${verifiedWorkflow.active}`);
  } catch (error: any) {
    console.error("[N8N] ❌ Erro ao despublicar workflow:", error.response?.data || error.message);
    throw new Error(`Falha ao despublicar workflow: ${error.response?.data?.message || error.message}`);
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

/**
 * Verifica se o workflow está publicado
 */
export async function isWorkflowPublished(workflowId: string): Promise<boolean> {
  try {
    const response = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = response.data.data || response.data;
    // N8N 2.1.4+ usa 'published' ao invés de 'active'
    return workflow.published === true || workflow.active === true; // Compatibilidade com versões antigas
  } catch (error: any) {
    console.error("[N8N] Erro ao verificar status do workflow:", error.response?.data || error.message);
    return false;
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
    openaiModel?: string;
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
        openaiModel: config.openaiModel,
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
 * Atualiza modelo OpenAI no workflow N8N
 * Atualiza todos os nodes que usam modelos OpenAI:
 * - @n8n/n8n-nodes-langchain.lmChatOpenAi (modelo principal do agente)
 * - @n8n/n8n-nodes-langchain.openAi (para análise de imagem, etc)
 * - Nodes com modelId em parameters
 */
export async function updateModelInWorkflow(
  workflowId: string,
  model: string // 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', etc.
): Promise<boolean> {
  try {
    console.log(`[N8N] 🔄 Atualizando modelo para ${model} no workflow ${workflowId}...`);
    
    // Buscar workflow atual
    const workflowResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = workflowResponse.data.data || workflowResponse.data;

    if (!workflow || !workflow.nodes) {
      console.error("[N8N] Workflow não encontrado ou sem nodes");
      return false;
    }

    // Atualizar todos os nodes que usam modelos OpenAI
    let updatedCount = 0;
    const updatedNodes = workflow.nodes.map((node: any) => {
      let nodeUpdated = false;

      // 1. Nodes do tipo lmChatOpenAi (modelo principal do agente)
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
        if (node.parameters) {
          node.parameters.model = model;
          nodeUpdated = true;
          console.log(`[N8N] ✅ Node "${node.name}" (lmChatOpenAi) atualizado para modelo ${model}`);
        }
      }

      // 2. Nodes do tipo openAi (para análise de imagem, formatação, etc)
      if (node.type === '@n8n/n8n-nodes-langchain.openAi') {
        if (node.parameters) {
          // NÃO atualizar nodes de transcrição de áudio (Whisper)
          if (node.parameters.resource === 'audio' && node.parameters.operation === 'transcribe') {
            console.log(`[N8N] ⏭️ Node "${node.name}" é de transcrição de áudio, mantendo modelo original`);
            return node; // Não alterar
          }

          // Atualizar análise de imagem e outros usos
          if (node.parameters.modelId) {
            if (typeof node.parameters.modelId === 'object' && node.parameters.modelId.value) {
              node.parameters.modelId.value = model;
            } else {
              node.parameters.modelId = model;
            }
            nodeUpdated = true;
            console.log(`[N8N] ✅ Node "${node.name}" (openAi) atualizado para modelo ${model}`);
          }
          // Se tiver model diretamente, atualizar também
          if (node.parameters.model) {
            node.parameters.model = model;
            nodeUpdated = true;
          }
        }
      }

      // 3. Nodes com modelId em parameters (análise de imagem, etc)
      if (node.parameters?.modelId && !nodeUpdated) {
        if (typeof node.parameters.modelId === 'object' && node.parameters.modelId.value) {
          // Só atualizar se for um modelo de texto (não vision específico)
          const currentModel = node.parameters.modelId.value;
          if (currentModel && !currentModel.includes('vision') && !currentModel.includes('whisper')) {
            node.parameters.modelId.value = model;
            nodeUpdated = true;
            console.log(`[N8N] ✅ Node "${node.name}" (modelId) atualizado para modelo ${model}`);
          }
        }
      }

      if (nodeUpdated) {
        updatedCount++;
      }

      return node;
    });

    if (updatedCount === 0) {
      console.warn("[N8N] ⚠️ Nenhum node de modelo OpenAI encontrado no workflow");
      return false;
    }

    // Atualizar workflow
    // IMPORTANTE: 'active' é read-only no N8N 2.1.4+, não incluir no payload
    const updatePayload: any = {
      name: workflow.name,
      nodes: updatedNodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    };

    // Manter apenas published (active é read-only e não pode ser incluído)
    if (workflow.published !== undefined) {
      updatePayload.published = workflow.published;
    }
    // NÃO incluir active - é read-only e causa erro

    await n8nApi.put(`/workflows/${workflowId}`, updatePayload);

    // Verificar se workflow precisa ser republicado após atualização
    if (workflow.published === true) {
      console.log(`[N8N] 📋 Workflow estava publicado, mantendo estado publicado`);
    }

    console.log(`[N8N] ✅ Modelo atualizado em ${updatedCount} node(s) do workflow ${workflowId}`);
    return true;
  } catch (error: any) {
    console.error("[N8N] Erro ao atualizar modelo:", error.response?.data || error.message);
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
    openaiModel?: string;
  }
): Promise<boolean> {
  try {
    // Buscar workflow atual
    const workflowResponse = await n8nApi.get(`/workflows/${workflowId}`);
    const workflow = workflowResponse.data.data || workflowResponse.data;

    // Modificar nodes com novas configurações
    const updatedNodes = workflow.nodes.map((node: any) => {
      // Atualizar modelo OpenAI
      if (config.openaiModel && node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
        if (node.parameters) {
          node.parameters.model = config.openaiModel;
        }
      }

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
