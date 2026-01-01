/**
 * CÓDIGOS PRONTOS PARA COPIAR E COLAR NO N8N
 * 
 * Copie o código apropriado para cada tipo de node
 */

// ============================================
// 1. NODE CODE: Capturar Uso - Chat (OpenAI Direto)
// ============================================
// Use este código em um node "Code" APÓS um node OpenAI de chat
// Substitua "OpenAI Chat Model" pelo nome do seu node anterior

const inputData = $input.item.json;

// Extrair informações de uso
const usage = inputData.usage || {};
const model = inputData.model || $node["OpenAI Chat Model"].json.model || 'gpt-4o-mini';

// Nome do node anterior (ajustar conforme necessário)
const nodeName = $node["OpenAI Chat Model"].name || 'OpenAI Chat Model';

return {
  json: {
    ...inputData,
    usageData: {
      operation: 'chat',
      model: model,
      tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      metadata: {
        workflowId: $workflow.id,
        nodeName: nodeName,
        executionId: $execution.id
      }
    }
  }
};

// ============================================
// 2. NODE CODE: Capturar Uso - Áudio (Whisper)
// ============================================
// Use este código em um node "Code" APÓS um node OpenAI de transcrição

const inputData = $input.item.json;
const nodeName = $node["OpenAI4"].name || 'Transcribe Recording'; // Ajustar nome do node

// Para Whisper, pode não ter tokens, mas sim duração
const audioDuration = inputData.audioDurationSeconds || inputData.duration || inputData.audio_duration || 0;

return {
  json: {
    ...inputData,
    usageData: {
      operation: 'audio',
      model: 'whisper-1',
      audioDurationSeconds: audioDuration,
      tokensInput: 0, // Whisper não usa tokens da mesma forma
      tokensOutput: 0,
      totalTokens: 0,
      metadata: {
        workflowId: $workflow.id,
        nodeName: nodeName,
        executionId: $execution.id
      }
    }
  }
};

// ============================================
// 3. NODE CODE: Capturar Uso - Imagem (Vision)
// ============================================
// Use este código em um node "Code" APÓS um node OpenAI de análise de imagem

const inputData = $input.item.json;
const usage = inputData.usage || {};
const model = inputData.model || 'gpt-4o-vision';
const nodeName = $node["Analyze image"].name || 'Analyze Image'; // Ajustar nome

return {
  json: {
    ...inputData,
    usageData: {
      operation: 'image',
      model: model,
      tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      metadata: {
        workflowId: $workflow.id,
        nodeName: nodeName,
        executionId: $execution.id
      }
    }
  }
};

// ============================================
// 4. NODE CODE: Capturar Uso - PDF (Message a model)
// ============================================
// Use este código em um node "Code" APÓS o node "Message a model" que processa PDF

const inputData = $input.item.json;
const usage = inputData.usage || {};
const model = inputData.model || 'gpt-4o-mini';
const nodeName = $node["Message a model"].name || 'Message a model'; // Ajustar nome

return {
  json: {
    ...inputData,
    usageData: {
      operation: 'pdf',
      model: model,
      tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      metadata: {
        workflowId: $workflow.id,
        nodeName: nodeName,
        executionId: $execution.id
      }
    }
  }
};

// ============================================
// 5. NODE CODE: Agregar Uso do LangChain Agent
// ============================================
// Use este código em um node "Code" que recebe a SAÍDA do LangChain Agent
// Este node deve estar DEPOIS do LangChain Agent, mesmo que seja o último node

const inputData = $input.item.json;

// Tentar extrair dados de uso de diferentes formatos possíveis
let usageData = null;

// Formato 1: Dados diretos no JSON
if (inputData.usage) {
  const usage = inputData.usage;
  const model = inputData.model || 'gpt-4o-mini';
  
  usageData = {
    operation: 'chat',
    model: model,
    tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
    tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
    totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Agent',
      executionId: $execution.id
    }
  };
}

// Formato 2: Dados em _usageData (se adicionado manualmente)
if (inputData._usageData) {
  usageData = {
    ...inputData._usageData,
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Agent',
      executionId: $execution.id,
      ...inputData._usageData.metadata
    }
  };
}

// Formato 3: Dados em usageData (já processado)
if (inputData.usageData) {
  usageData = inputData.usageData;
}

// Se encontrou dados de uso, retornar para envio ao webhook
if (usageData) {
  return {
    json: {
      usageData: usageData,
      // Manter resposta original sem dados de uso
      response: Object.fromEntries(
        Object.entries(inputData).filter(([key]) => 
          !['usageData', '_usageData', 'usage'].includes(key)
        )
      )
    }
  };
}

// Se não encontrou, retornar dados originais
return { json: inputData };

// ============================================
// 6. NODE CODE: Capturar Uso de Qualquer Node OpenAI
// ============================================
// Versão genérica que detecta automaticamente o tipo de operação

const inputData = $input.item.json;
const usage = inputData.usage || {};
const model = inputData.model || 'gpt-4o-mini';

// Detectar tipo de operação baseado no nome do node anterior
// Ajustar os nomes conforme seus nodes
const previousNodeName = $node["OpenAI Chat Model"].name || ''; // Ajustar nome
const nodeNameLower = previousNodeName.toLowerCase();

let operation = 'chat';

if (nodeNameLower.includes('audio') || nodeNameLower.includes('transcribe') || nodeNameLower.includes('whisper')) {
  operation = 'audio';
  const audioDuration = inputData.audioDurationSeconds || inputData.duration || 0;
  
  return {
    json: {
      ...inputData,
      usageData: {
        operation: 'audio',
        model: 'whisper-1',
        audioDurationSeconds: audioDuration,
        tokensInput: 0,
        tokensOutput: 0,
        totalTokens: 0,
        metadata: {
          workflowId: $workflow.id,
          nodeName: previousNodeName,
          executionId: $execution.id
        }
      }
    }
  };
}

if (nodeNameLower.includes('image') || nodeNameLower.includes('vision') || nodeNameLower.includes('analyze')) {
  operation = 'image';
}

if (nodeNameLower.includes('format') || nodeNameLower.includes('formatar')) {
  operation = 'format';
}

if (nodeNameLower.includes('pdf') || nodeNameLower.includes('extract')) {
  operation = 'pdf';
}

return {
  json: {
    ...inputData,
    usageData: {
      operation: operation,
      model: model,
      tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      metadata: {
        workflowId: $workflow.id,
        nodeName: previousNodeName,
        executionId: $execution.id
      }
    }
  }
};

// ============================================
// 7. HTTP REQUEST: Registrar Uso (Webhook)
// ============================================
// Configuração do node HTTP Request que envia dados ao backend

// URL (ajustar conforme seu ambiente):
// {{ $env.BACKEND_URL }}/api/webhooks/n8n/{{ $env.TENANT_ID }}
// Ou hardcoded: https://api.seudominio.com/api/webhooks/n8n/1

// Method: POST

// Body (JSON):
{
  "eventType": "usage_tracking",
  "data": "={{ $json.usageData }}",
  "timestamp": "={{ $now.toISO() }}"
}

// Headers:
// Content-Type: application/json

// IMPORTANTE:
// - Marcar "Continue On Fail" = true
// - Não esperar resposta (não bloquear workflow)

// ============================================
// 8. HTTP REQUEST: Registrar Múltiplos Usos (Batch)
// ============================================
// Para quando você tem múltiplos usos em uma única execução

// URL: {{ $env.BACKEND_URL }}/api/webhooks/n8n/{{ $env.TENANT_ID }}

// Method: POST

// Body (JSON):
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData }}",
  "timestamp": "={{ $now.toISO() }}"
}

// ============================================
// INSTRUÇÕES DE USO
// ============================================
// 
// 1. Copie o código apropriado para um node "Code" no N8N
// 2. Ajuste os nomes dos nodes anteriores (ex: "OpenAI Chat Model")
// 3. Adicione um node "HTTP Request" depois do Code
// 4. Configure o HTTP Request conforme exemplo acima
// 5. Marque "Continue On Fail" no HTTP Request
// 6. Teste executando o workflow manualmente
// 7. Verifique os logs do backend e a tabela usageTransactions
//
// ============================================

