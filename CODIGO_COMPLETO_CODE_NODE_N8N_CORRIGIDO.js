// ============================================
// CÓDIGO COMPLETO - CAPTURAR CRÉDITOS (VERSÃO CORRIGIDA)
// ============================================
// Cole este código COMPLETO no Code node do N8N
// Versão corrigida com workflowId funcionando

const inputData = $input.item.json;

// 1. Pegar tenantId
const tenantId = inputData.tenantId || null;

// 2. Pegar workflowId (CORRIGIDO - capturar no início)
const workflowId = $workflow.id || inputData.workflowId || null;

// 3. Pegar executionId
const executionId = $execution.id || inputData.executionId || null;

if (!tenantId) {
  return { 
    json: { 
      ...inputData,
      _credits: { 
        tenantId: null, 
        allUsageData: [],
        timestamp: new Date().toISOString()
      } 
    } 
  };
}

// 4. Função para estimar tokens (MAIS CONSERVADORA - 35% de margem)
function estimateTokensFromText(text) {
  if (!text || typeof text !== 'string') return null;
  
  const textLength = text.length;
  const baseInputTokens = 1500; // Input fixo
  
  // Ratio MAIS CONSERVADOR para mensagens curtas
  let outputRatio;
  
  if (textLength <= 100) {
    outputRatio = 13.0; // AUMENTADO de 12.0 para 13.0
  } else if (textLength <= 150) {
    outputRatio = 11.0; // AUMENTADO de 10.0 para 11.0
  } else if (textLength <= 250) {
    outputRatio = 9.5; // AUMENTADO de 8.5 para 9.5
  } else if (textLength <= 350) {
    outputRatio = 8.5; // AUMENTADO de 7.5 para 8.5
  } else {
    outputRatio = 7.5; // AUMENTADO de 6.5 para 7.5
  }
  
  // +15% se tiver markdown
  const hasMarkdown = text.includes('**') || 
                     text.includes('_') || 
                     text.includes('\n\n') ||
                     text.includes('#');
  
  if (hasMarkdown) {
    outputRatio *= 1.15;
  }
  
  const outputTokens = Math.ceil(textLength * outputRatio);
  
  // ADICIONAR MARGEM EXTRA DE 35% (AUMENTADO de 25% para 35%)
  const totalEstimated = baseInputTokens + outputTokens;
  const totalWithMargin = Math.ceil(totalEstimated * 1.35);
  
  // Distribuir margem proporcionalmente
  const marginRatio = totalWithMargin / totalEstimated;
  
  return {
    tokensInput: Math.ceil(baseInputTokens * marginRatio),
    tokensOutput: Math.ceil(outputTokens * marginRatio),
    totalTokens: totalWithMargin
  };
}

// 5. Array para armazenar todos os usos
const allUsageData = [];

// 6. Tentar pegar usage real primeiro
const usage = inputData.usage || 
              inputData._usage ||
              inputData.supervisorOutput?.usage ||
              null;

// 7. Pegar modelo real escolhido pelo usuário
const selectedModel = $('Buscar Configurações Agente').first().json.openaiModel || 
                      inputData.openaiModel ||
                      'gpt-4.1-mini'; // Fallback

// 8. Tentar pegar agentId do fluxo (se disponível)
const agentId = inputData.agentId || 
                inputData.metadata?.agentId ||
                $('Buscar Configurações Agente').first().json.agentId ||
                null;

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  // Usar dados reais com margem extra (35% em vez de 25%)
  const realTotal = usage.total_tokens || 
                   (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  
  const totalWithMargin = Math.ceil(realTotal * 1.35);
  
  allUsageData.push({
    operation: 'chat',
    model: selectedModel, // ✅ USA O MODELO REAL ESCOLHIDO PELO USUÁRIO
    tokensInput: Math.ceil((usage.prompt_tokens || 0) * 1.35),
    tokensOutput: Math.ceil((usage.completion_tokens || 0) * 1.35),
    totalTokens: totalWithMargin,
    isEstimated: false,
    metadata: {
      originalModel: selectedModel,
      note: 'Dados reais com 35% margem',
      workflowId: workflowId, // ✅ USAR A VARIÁVEL CAPTURADA NO INÍCIO
      executionId: executionId,
      nodeName: 'LangChain Supervisor',
      agentId: agentId // ✅ INCLUIR agentId SE DISPONÍVEL
    }
  });
} else {
  // Estimar usando fórmula
  const responseText = inputData.output || 
                       inputData.text || 
                       inputData.supervisorOutput?.output ||
                       inputData.content ||
                       '';
  
  if (responseText) {
    const estimation = estimateTokensFromText(responseText);
    
    if (estimation) {
      allUsageData.push({
        operation: 'chat',
        model: selectedModel, // ✅ USA O MODELO REAL ESCOLHIDO PELO USUÁRIO
        tokensInput: estimation.tokensInput,
        tokensOutput: estimation.tokensOutput,
        totalTokens: estimation.totalTokens,
        isEstimated: true,
        metadata: {
          textLength: responseText.length,
          formula: 'Baseada em dados reais + ajustada para mensagens curtas + 35% margem',
          originalModel: selectedModel,
          workflowId: workflowId, // ✅ USAR A VARIÁVEL CAPTURADA NO INÍCIO
          nodeName: 'LangChain Supervisor',
          executionId: executionId,
          agentId: agentId // ✅ INCLUIR agentId SE DISPONÍVEL
        }
      });
    }
  } else {
    // Valor mínimo aumentado para mensagens curtas
    allUsageData.push({
      operation: 'chat',
      model: selectedModel, // ✅ USA O MODELO REAL ESCOLHIDO PELO USUÁRIO
      tokensInput: 2025, // Aumentado de 1875
      tokensOutput: 4050, // Aumentado de 3000
      totalTokens: 6075, // Aumentado de 4875
      isEstimated: true,
      metadata: {
        note: 'Valor mínimo aumentado para mensagens curtas (35% margem)',
        workflowId: workflowId, // ✅ USAR A VARIÁVEL CAPTURADA NO INÍCIO
        executionId: executionId,
        nodeName: 'LangChain Supervisor',
        agentId: agentId // ✅ INCLUIR agentId SE DISPONÍVEL
      }
    });
  }
}

// 9. Capturar áudio (se tiver)
try {
  const audioData = inputData.audioData || inputData;
  
  if (audioData.usage && audioData.usage.duration && audioData.usage.duration.seconds) {
    const durationSeconds = audioData.usage.duration.seconds;
    
    if (durationSeconds > 0) {
      allUsageData.push({
        operation: 'audio',
        model: 'whisper-1',
        audioDurationSeconds: durationSeconds,
        tokensInput: 0,
        tokensOutput: 0,
        totalTokens: 0,
        isEstimated: false,
        metadata: {
          workflowId: workflowId, // ✅ USAR A VARIÁVEL CAPTURADA NO INÍCIO
          executionId: executionId,
          nodeName: 'Audio Transcription',
          agentId: agentId // ✅ INCLUIR agentId SE DISPONÍVEL
        }
      });
    }
  }
} catch (e) {
  // Ignorar
}

// 10. Capturar imagem (se tiver)
try {
  const imageData = inputData.imageData || inputData;
  const imageContent = imageData.content || '';
  
  if (imageContent && !inputData.usage?.duration) {
    const estimatedTokens = Math.ceil((imageContent.length / 3.5) * 1.35); // Aumentado de 1.25 para 1.35
    
    allUsageData.push({
      operation: 'image',
      model: selectedModel, // ✅ USA O MODELO REAL ESCOLHIDO PELO USUÁRIO
      tokensInput: Math.ceil(estimatedTokens * 0.7),
      tokensOutput: Math.ceil(estimatedTokens * 0.3),
      totalTokens: estimatedTokens,
      isEstimated: true,
      metadata: {
        note: 'Estimativa de imagem com 35% margem',
        workflowId: workflowId, // ✅ USAR A VARIÁVEL CAPTURADA NO INÍCIO
        executionId: executionId,
        nodeName: 'Image Processing',
        agentId: agentId // ✅ INCLUIR agentId SE DISPONÍVEL
      }
    });
  }
} catch (e) {
  // Ignorar
}

// 11. Converter array para JSON string ANTES de retornar
const allUsageDataJson = JSON.stringify(allUsageData);

// 12. Retornar resultado
return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData, // Array original (para debug)
      allUsageDataJson: allUsageDataJson, // STRING JSON - USE ESTE NO HTTP REQUEST
      timestamp: new Date().toISOString(),
      totalItems: allUsageData.length,
      workflowId: workflowId, // ✅ INCLUIR workflowId NO RETORNO TAMBÉM
      executionId: executionId // ✅ INCLUIR executionId NO RETORNO TAMBÉM
    }
  }
};

