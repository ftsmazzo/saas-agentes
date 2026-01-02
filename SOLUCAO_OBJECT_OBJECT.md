# ✅ Solução: [object Object] no HTTP Request

## 🐛 PROBLEMA

O N8N está convertendo o array para string `"[object Object]"`:

```json
{
  "data": "=[object Object]"  // ❌ Array virou string
}
```

## ✅ SOLUÇÃO: Modificar Code para Retornar String JSON

**O backend já trata strings e faz JSON.parse. Vamos modificar o Code para retornar string JSON.**

---

## 🔧 CÓDIGO COMPLETO ATUALIZADO

**Cole este código COMPLETO no Code node:**

```javascript
// ============================================
// CÓDIGO COMPLETO - COM STRING JSON PARA HTTP REQUEST
// ============================================

const inputData = $input.item.json;

// 1. Pegar tenantId
const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { 
    json: { 
      ...inputData,
      _credits: { 
        tenantId: null, 
        allUsageData: [],
        allUsageDataJson: "[]",
        timestamp: new Date().toISOString()
      } 
    } 
  };
}

// 2. Função para estimar tokens (ajustada para mensagens curtas)
function estimateTokensFromText(text) {
  if (!text || typeof text !== 'string') return null;
  
  const textLength = text.length;
  const baseInputTokens = 1500;
  
  // Ratio MAIS CONSERVADOR para mensagens curtas
  let outputRatio;
  
  if (textLength <= 100) {
    outputRatio = 12.0;
  } else if (textLength <= 150) {
    outputRatio = 10.0;
  } else if (textLength <= 250) {
    outputRatio = 8.5;
  } else if (textLength <= 350) {
    outputRatio = 7.5;
  } else {
    outputRatio = 6.5;
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
  const totalEstimated = baseInputTokens + outputTokens;
  const totalWithMargin = Math.ceil(totalEstimated * 1.25);
  
  const marginRatio = totalWithMargin / totalEstimated;
  
  return {
    tokensInput: Math.ceil(baseInputTokens * marginRatio),
    tokensOutput: Math.ceil(outputTokens * marginRatio),
    totalTokens: totalWithMargin
  };
}

// 3. Array para armazenar todos os usos
const allUsageData = [];

// 4. Tentar pegar usage real primeiro
const usage = inputData.usage || 
              inputData._usage ||
              inputData.supervisorOutput?.usage ||
              null;

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  const realTotal = usage.total_tokens || 
                   (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  
  const totalWithMargin = Math.ceil(realTotal * 1.25);
  
  allUsageData.push({
    operation: 'chat',
    model: 'gpt-4.1-mini',
    tokensInput: Math.ceil((usage.prompt_tokens || 0) * 1.25),
    tokensOutput: Math.ceil((usage.completion_tokens || 0) * 1.25),
    totalTokens: totalWithMargin,
    isEstimated: false,
    metadata: {
      originalModel: inputData.model || inputData.supervisorOutput?.model || 'gpt-4.1-mini',
      note: 'Dados reais com 25% margem'
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
        model: 'gpt-4.1-mini',
        tokensInput: estimation.tokensInput,
        tokensOutput: estimation.tokensOutput,
        totalTokens: estimation.totalTokens,
        isEstimated: true,
        metadata: {
          textLength: responseText.length,
          formula: 'Baseada em dados reais + ajustada para mensagens curtas + 25% margem',
          originalModel: inputData.model || inputData.supervisorOutput?.model || 'gpt-4.1-mini',
          workflowId: inputData.workflowId || $workflow.id,
          nodeName: 'LangChain Supervisor',
          executionId: $execution.id
        }
      });
    }
  } else {
    allUsageData.push({
      operation: 'chat',
      model: 'gpt-4.1-mini',
      tokensInput: 1875,
      tokensOutput: 3000,
      totalTokens: 4875,
      isEstimated: true,
      metadata: {
        note: 'Valor mínimo aumentado para mensagens curtas'
      }
    });
  }
}

// 5. Capturar áudio (se tiver)
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
        isEstimated: false
      });
    }
  }
} catch (e) {
  // Ignorar
}

// 6. Capturar imagem (se tiver)
try {
  const imageData = inputData.imageData || inputData;
  const imageContent = imageData.content || '';
  
  if (imageContent && !inputData.usage?.duration) {
    const estimatedTokens = Math.ceil((imageContent.length / 3.5) * 1.25);
    
    allUsageData.push({
      operation: 'image',
      model: 'gpt-4.1-mini',
      tokensInput: Math.ceil(estimatedTokens * 0.7),
      tokensOutput: Math.ceil(estimatedTokens * 0.3),
      totalTokens: estimatedTokens,
      isEstimated: true,
      metadata: {
        note: 'Estimativa de imagem com 25% margem'
      }
    });
  }
} catch (e) {
  // Ignorar
}

// 7. CONVERTER PARA STRING JSON (para evitar [object Object])
const allUsageDataJson = JSON.stringify(allUsageData);

// 8. Retornar resultado
return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData, // Array original (para debug)
      allUsageDataJson: allUsageDataJson, // String JSON (para HTTP Request)
      timestamp: new Date().toISOString(),
      totalItems: allUsageData.length
    }
  }
};
```

---

## 🔧 CONFIGURAÇÃO HTTP REQUEST

**No HTTP Request, use a string JSON:**

**Body Content Type:** `JSON`

**Body (JSON):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageDataJson }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**O backend já trata strings que começam com "=" e faz JSON.parse automaticamente!**

---

## ✅ O QUE MUDOU

1. ✅ **Code retorna `allUsageDataJson`** - String JSON do array
2. ✅ **HTTP Request usa `allUsageDataJson`** - Envia string
3. ✅ **Backend faz JSON.parse** - Converte de volta para array
4. ✅ **Não aparece mais `[object Object]`** - É string JSON válida

---

## 🧪 TESTE

1. **Cole o código atualizado** no Code node
2. **Configure HTTP Request** com `allUsageDataJson`
3. **Execute** e veja o Result
4. **Deve aparecer:** `"data": "[{...}]"` (string JSON válida)
5. **Backend vai receber** e fazer parse corretamente

---

## ✅ RESUMO

**Solução:**
- ✅ Code retorna string JSON (`allUsageDataJson`)
- ✅ HTTP Request envia string
- ✅ Backend faz JSON.parse
- ✅ Funciona mesmo se N8N converter para string

**Teste e me diga se funcionou!**

