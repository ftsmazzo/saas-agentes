# ✅ Código Completo Final - Code Node + HTTP Request

## 🔧 CÓDIGO COMPLETO DO CODE NODE

**Cole este código COMPLETO no Code node:**

```javascript
// ============================================
// CÓDIGO COMPLETO - CAPTURAR CRÉDITOS
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
        timestamp: new Date().toISOString()
      } 
    } 
  };
}

// 2. Função para estimar tokens (MAIS CONSERVADORA - 35% de margem)
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

// 3. Array para armazenar todos os usos
const allUsageData = [];

// 4. Tentar pegar usage real primeiro
const usage = inputData.usage || 
              inputData._usage ||
              inputData.supervisorOutput?.usage ||
              null;

// Pegar modelo real escolhido pelo usuário
const selectedModel = inputData.model || 
                      inputData.supervisorOutput?.model || 
                      inputData.openaiModel ||
                      'gpt-4.1-mini'; // Fallback

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
      note: 'Dados reais com 35% margem'
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
          workflowId: inputData.workflowId || $workflow.id,
          nodeName: 'LangChain Supervisor',
          executionId: $execution.id
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
        note: 'Valor mínimo aumentado para mensagens curtas (35% margem)'
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
    const estimatedTokens = Math.ceil((imageContent.length / 3.5) * 1.35); // Aumentado de 1.25 para 1.35
    
    allUsageData.push({
      operation: 'image',
      model: selectedModel, // ✅ USA O MODELO REAL ESCOLHIDO PELO USUÁRIO
      tokensInput: Math.ceil(estimatedTokens * 0.7),
      tokensOutput: Math.ceil(estimatedTokens * 0.3),
      totalTokens: estimatedTokens,
      isEstimated: true,
      metadata: {
        note: 'Estimativa de imagem com 35% margem'
      }
    });
  }
} catch (e) {
  // Ignorar
}

// 7. Converter array para JSON string ANTES de retornar
const allUsageDataJson = JSON.stringify(allUsageData);

// 8. Retornar resultado
return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData, // Array original (para debug)
      allUsageDataJson: allUsageDataJson, // STRING JSON - USE ESTE NO HTTP REQUEST
      timestamp: new Date().toISOString(),
      totalItems: allUsageData.length
    }
  }
};
```

---

## 🔧 CONFIGURAÇÃO HTTP REQUEST

**No HTTP Request node, configure assim:**

### URL:
```
http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json._credits.tenantId }}
```

### Method:
```
POST
```

### Body Content Type:
```
JSON
```

### Body (JSON) - OPÇÃO 1 (RECOMENDADO - Usa allUsageDataJson):

**Use "Specify Body" → "Using JSON" e cole:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageDataJson }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**IMPORTANTE:** 
- Use `allUsageDataJson` (que já é uma STRING JSON criada no Code node)
- O backend vai remover o `={{` e fazer `JSON.parse` automaticamente

---

### Body (JSON) - OPÇÃO 2 (RECOMENDADO - JSON.stringify direto):

**⚠️ ATENÇÃO: NÃO use aspas duplas ao redor da expressão!**

**No HTTP Request node:**
1. **Body Content Type:** `JSON`
2. **Specify Body:** `Using JSON`
3. **Cole EXATAMENTE isto (copie e cole, sem modificar):**

```json
{
  "eventType": "usage_tracking_batch",
  "data": ={{ JSON.stringify($json._credits.allUsageData) }},
  "timestamp": ={{ $json._credits.timestamp }}
}
```

**IMPORTANTE:** 
- **NÃO coloque aspas** ao redor das expressões `={{ ... }}`
- O N8N vai processar as expressões e converter para JSON
- `JSON.stringify` converte o array para string JSON válida
- **NÃO vai causar loop** porque não acessa outros nodes

**Se o N8N reclamar, tente com aspas nas expressões:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ JSON.stringify($json._credits.allUsageData) }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

### Body (JSON) - ALTERNATIVA (Se a opção acima não funcionar):

**Use "Specify Body" → "Using JSON" e configure campo por campo:**

1. **Campo 1:**
   - Name: `eventType`
   - Value: `usage_tracking_batch`

2. **Campo 2:**
   - Name: `data`
   - Value: `={{ $json._credits.allUsageDataJson }}` ← **USE allUsageDataJson**

3. **Campo 3:**
   - Name: `timestamp`
   - Value: `={{ $json._credits.timestamp }}`

### Options:
- ✅ **Continue On Fail:** `TRUE`
- ✅ **Response:** `Last Node Output`

---

## 🐛 CORRIGIR PROBLEMA "[object Object]"

**O problema é que o N8N converte objetos para `[object Object]` quando não são strings JSON.**

**Solução:**
- **No Code node:** Criar `allUsageDataJson = JSON.stringify(allUsageData)` ✅ (JÁ FEITO NO CÓDIGO)
- **No HTTP Request:** Usar `"data": "={{ $json._credits.allUsageDataJson }}"` ✅
- **NÃO use `allUsageData` diretamente** - sempre use `allUsageDataJson`

---

## 🧪 TESTE

1. **Cole o código completo** no Code node (já tem o `allUsageDataJson`)
2. **Configure o HTTP Request** com a **OPÇÃO 2** primeiro (usa `JSON.stringify` direto)
3. **Execute** e veja o output do HTTP Request
4. **O campo `data` deve ser uma string JSON válida**, não `[object Object]`
5. **Verifique** os logs do backend para confirmar que recebeu corretamente

**Se ainda der problema:**
- Tente Opção 1 (usa `allUsageDataJson` do Code node)
- Ou Opção 3 (campo por campo com `JSON.stringify`)

---

## ✅ RESUMO

**Código completo:**
- ✅ Captura chat, áudio e imagem
- ✅ Fórmula ajustada para mensagens curtas
- ✅ +25% margem extra
- ✅ Sempre modelo 4.1-mini

**HTTP Request:**
- ✅ Body sem aspas no campo `data`
- ✅ Ou usar JSON.stringify se necessário

**Teste e me diga se funcionou!**

