# ✅ Código Final - Áudio e Imagem com Estimativas

## 🎯 DADOS IDENTIFICADOS

**Áudio (OpenAI4):**
- `text`: Texto transcrito
- `usage`: Objeto com `type` e `duration.seconds` (duração em segundos)

**Imagem (Analyze image):**
- `content`: Descrição da imagem
- Split message: Divide a imagem (consumo menor)

## ✅ SOLUÇÃO: Capturar com Estimativas + Margem de Segurança

---

## 🔧 CÓDIGO COMPLETO

**Cole este código no Code node "Preparar Dados para Créditos":**

```javascript
// ============================================
// CAPTURAR ÁUDIO, IMAGEM E CHAT COM ESTIMATIVAS
// ============================================

const inputData = $input.item.json;

// 1. Pegar tenantId
const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { json: { ...inputData, _credits: { tenantId: null, allUsageData: [] } } };
}

// 2. Função para estimar tokens (1 token ≈ 4 caracteres)
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
}

// 3. Função para adicionar margem de segurança (15%)
function addSafetyMargin(tokens) {
  return Math.ceil(tokens * 1.15);
}

const allUsageData = [];

// ============================================
// 4. CAPTURAR ÁUDIO (OpenAI4 - Whisper)
// ============================================

try {
  // Tentar pegar dados do áudio do input (se vier do Set)
  const audioData = inputData.audioData || inputData;
  
  // Verificar se tem dados de áudio
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
        isEstimated: false, // Dados reais de duração
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'OpenAI4 (Whisper)',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  // Ignorar se não tiver áudio
}

// ============================================
// 5. CAPTURAR IMAGEM (Analyze image)
// ============================================

try {
  // Tentar pegar dados da imagem do input (se vier do Set)
  const imageData = inputData.imageData || inputData;
  
  // Verificar se tem conteúdo de imagem
  const imageContent = imageData.content || imageData.text || imageData.output || '';
  
  if (imageContent) {
    // Estimar tokens baseado no conteúdo (Split já processou, então é menor)
    const estimatedTokens = estimateTokens(imageContent);
    
    // Adicionar margem de segurança (15%)
    const tokensWithMargin = addSafetyMargin(estimatedTokens);
    
    // Para imagem, geralmente é mais input (análise) que output
    const tokensInput = Math.ceil(tokensWithMargin * 0.7); // 70% input
    const tokensOutput = Math.ceil(tokensWithMargin * 0.3); // 30% output
    
    allUsageData.push({
      operation: 'image',
      model: imageData.model || 'gpt-4o-vision',
      tokensInput: tokensInput,
      tokensOutput: tokensOutput,
      totalTokens: tokensInput + tokensOutput,
      isEstimated: true,
      metadata: {
        workflowId: $workflow.id,
        nodeName: 'Analyze image',
        executionId: $execution.id,
        note: 'Estimativa baseada em conteúdo (Split processado) + 15% margem'
      }
    });
  }
} catch (e) {
  // Ignorar se não tiver imagem
}

// ============================================
// 6. CAPTURAR CHAT (Supervisor ou outros)
// ============================================

try {
  // Tentar pegar usage real primeiro
  const usage = inputData.usage || inputData._usage || null;
  
  if (usage && usage.total_tokens) {
    // Usar dados reais se disponíveis
    allUsageData.push({
      operation: 'chat',
      model: inputData.model || 'gpt-4o-mini',
      tokensInput: usage.prompt_tokens || 0,
      tokensOutput: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      isEstimated: false
    });
  } else {
    // Estimar baseado no texto da resposta
    const responseText = inputData.output || 
                         inputData.text || 
                         inputData.content ||
                         inputData.response ||
                         '';
    
    if (responseText) {
      const estimatedOutput = estimateTokens(responseText);
      const estimatedInput = Math.ceil(estimatedOutput * 0.3); // Input geralmente menor
      
      // Adicionar margem de segurança
      const totalEstimated = addSafetyMargin(estimatedInput + estimatedOutput);
      
      allUsageData.push({
        operation: 'chat',
        model: inputData.model || 'gpt-4o-mini',
        tokensInput: Math.ceil(totalEstimated * 0.3),
        tokensOutput: Math.ceil(totalEstimated * 0.7),
        totalTokens: totalEstimated,
        isEstimated: true,
        metadata: {
          note: 'Estimativa baseada em tamanho do texto + 15% margem'
        }
      });
    } else {
      // Se nem texto tiver, registrar uso mínimo com margem
      allUsageData.push({
        operation: 'chat',
        model: inputData.model || 'gpt-4o-mini',
        tokensInput: 115, // 100 + 15%
        tokensOutput: 58, // 50 + 15%
        totalTokens: 173, // 150 + 15%
        isEstimated: true,
        metadata: {
          note: 'Uso mínimo estimado com margem de segurança'
        }
      });
    }
  }
} catch (e) {
  // Ignorar erro
}

// ============================================
// 7. RETORNAR RESULTADO
// ============================================

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString(),
      totalItems: allUsageData.length
    }
  }
};
```

---

## 🔧 CONFIGURAÇÃO DO SET NODE

**Configure o Set node para passar dados de áudio e imagem:**

### Campos do Set Node:

1. **tenantId**
   - Value: `={{ $('Edit Fields2').item.json.tenantId }}`

2. **supervisorOutput**
   - Value: `={{ $json }}` (dados do Supervisor)

3. **audioData** (opcional - só se tiver áudio)
   - Value: `={{ $('OpenAI4').item.json }}`

4. **imageData** (opcional - só se tiver imagem)
   - Value: `={{ $('Analyze image').item.json }}`

**Importante:** Os campos `audioData` e `imageData` são opcionais. O código trata quando não existem.

---

## 🔧 VERSÃO SIMPLIFICADA (Se Set Node Travar)

**Se o Set node travar ao acessar outros nodes, use esta versão que só usa input:**

```javascript
// VERSÃO SIMPLIFICADA - SÓ USA INPUT
const inputData = $input.item.json;

const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { json: { ...inputData, _credits: { tenantId: null, allUsageData: [] } } };
}

function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
}

function addSafetyMargin(tokens) {
  return Math.ceil(tokens * 1.15);
}

const allUsageData = [];

// Verificar se tem dados de áudio no input
if (inputData.usage && inputData.usage.duration && inputData.usage.duration.seconds) {
  const durationSeconds = inputData.usage.duration.seconds;
  if (durationSeconds > 0) {
    allUsageData.push({
      operation: 'audio',
      model: 'whisper-1',
      audioDurationSeconds: durationSeconds,
      tokensInput: 0,
      tokensOutput: 0,
      totalTokens: 0,
      isEstimated: false
    });
  }
}

// Verificar se tem conteúdo de imagem
const imageContent = inputData.content || inputData.text || '';
if (imageContent && !inputData.usage?.duration) {
  // Se tem conteúdo mas não é áudio, provavelmente é imagem
  const estimatedTokens = addSafetyMargin(estimateTokens(imageContent));
  allUsageData.push({
    operation: 'image',
    model: 'gpt-4o-vision',
    tokensInput: Math.ceil(estimatedTokens * 0.7),
    tokensOutput: Math.ceil(estimatedTokens * 0.3),
    totalTokens: estimatedTokens,
    isEstimated: true
  });
}

// Se não capturou nada acima, tratar como chat
if (allUsageData.length === 0) {
  const responseText = inputData.output || inputData.text || inputData.content || '';
  const estimatedOutput = estimateTokens(responseText);
  const totalEstimated = addSafetyMargin(estimatedOutput + Math.ceil(estimatedOutput * 0.3));
  
  allUsageData.push({
    operation: 'chat',
    model: inputData.model || 'gpt-4o-mini',
    tokensInput: Math.ceil(totalEstimated * 0.3),
    tokensOutput: Math.ceil(totalEstimated * 0.7),
    totalTokens: totalEstimated,
    isEstimated: true
  });
}

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString()
    }
  }
};
```

---

## 🎯 O QUE ESTE CÓDIGO FAZ

1. ✅ **Captura áudio** - Usa `duration.seconds` real (não estima)
2. ✅ **Captura imagem** - Estima baseado em `content` (Split processado)
3. ✅ **Adiciona 15% de margem** - Para segurança
4. ✅ **Trata quando não existe** - Não quebra se áudio/imagem não estiverem presentes
5. ✅ **Não trava** - Só usa input, não acessa outros nodes

---

## 🧪 TESTE

1. **Cole o código** no Code node
2. **Configure Set node** (ou use versão simplificada)
3. **Teste com áudio** - Deve capturar duration
4. **Teste com imagem** - Deve estimar baseado em content
5. **Teste com chat** - Deve estimar baseado em texto
6. **Verifique no banco** se salvou

---

## ✅ RESUMO

**Solução:**
- ✅ Captura áudio (duration real)
- ✅ Captura imagem (estimativa com margem)
- ✅ Captura chat (estimativa com margem)
- ✅ 15% de margem de segurança
- ✅ Trata quando nodes não existem
- ✅ Não trava

**Teste e me diga se funcionou!**

