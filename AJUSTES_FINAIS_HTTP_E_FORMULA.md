# ✅ Ajustes Finais - HTTP Request e Fórmula

## 🐛 PROBLEMAS IDENTIFICADOS

1. **HTTP Request:** `data` está retornando `[object Object]` ao invés de JSON
2. **Fórmula:** Mensagens curtas estão sendo subestimadas

## ✅ SOLUÇÕES

---

## 🔧 1. CORRIGIR HTTP REQUEST

**No HTTP Request node, configure o Body assim:**

### Opção 1: Enviar Array Completo (RECOMENDADO)

**Body Content Type:** `JSON`

**Body (JSON):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": {{ JSON.stringify($json._credits.allUsageData) }},
  "timestamp": "{{ $json._credits.timestamp }}"
}
```

**OU se não funcionar com JSON.stringify:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageData }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

### Opção 2: Enviar Cada Item Separadamente

Se o array não funcionar, envie cada item:

**Body (JSON):**
```json
{
  "eventType": "usage_tracking",
  "data": {{ $json._credits.allUsageData[0] }},
  "timestamp": "{{ $json._credits.timestamp }}"
}
```

**E configure o HTTP Request para "Execute Once for Each Item"** se tiver múltiplos itens.

---

## 🔧 2. AJUSTAR FÓRMULA PARA MENSAGENS CURTAS

**Código atualizado do Code node:**

```javascript
// ============================================
// FÓRMULA AJUSTADA - MAIS CONSERVADORA EM MENSAGENS CURTAS
// ============================================

const inputData = $input.item.json;

const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { 
    json: { 
      ...inputData,
      _credits: { 
        tenantId: null, 
        allUsageData: [] 
      } 
    } 
  };
}

// Função ajustada - mais conservadora em mensagens curtas
function estimateTokensFromText(text) {
  if (!text || typeof text !== 'string') return null;
  
  const textLength = text.length;
  
  // Input fixo (baseado na análise: ~1500 tokens)
  const baseInputTokens = 1500;
  
  // Output: ratio MAIS CONSERVADOR para mensagens curtas
  let outputRatio;
  
  if (textLength <= 100) {
    outputRatio = 12.0; // MUITO MAIS CONSERVADOR para mensagens muito curtas
  } else if (textLength <= 150) {
    outputRatio = 10.0; // MAIS CONSERVADOR para mensagens curtas
  } else if (textLength <= 250) {
    outputRatio = 8.5; // Aumentado de 8.0 para 8.5
  } else if (textLength <= 350) {
    outputRatio = 7.5;
  } else {
    outputRatio = 6.5;
  }
  
  // Ajustar se tiver markdown (+15%)
  const hasMarkdown = text.includes('**') || 
                     text.includes('_') || 
                     text.includes('\n\n') ||
                     text.includes('#');
  
  if (hasMarkdown) {
    outputRatio *= 1.15;
  }
  
  const outputTokens = Math.ceil(textLength * outputRatio);
  
  // ADICIONAR MARGEM EXTRA DE 25% (cobre reexecuções e variações)
  const totalEstimated = baseInputTokens + outputTokens;
  const totalWithMargin = Math.ceil(totalEstimated * 1.25); // +25%
  
  // Distribuir a margem proporcionalmente
  const marginRatio = totalWithMargin / totalEstimated;
  
  return {
    tokensInput: Math.ceil(baseInputTokens * marginRatio),
    tokensOutput: Math.ceil(outputTokens * marginRatio),
    totalTokens: totalWithMargin
  };
}

const allUsageData = [];

// Tentar pegar usage real primeiro
const usage = inputData.usage || 
              inputData._usage ||
              inputData.supervisorOutput?.usage ||
              null;

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  // Usar dados reais se disponíveis, mas aplicar margem extra
  const realTotal = usage.total_tokens || 
                   (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  
  const totalWithMargin = Math.ceil(realTotal * 1.25); // +25% margem extra
  
  allUsageData.push({
    operation: 'chat',
    model: 'gpt-4.1-mini', // SEMPRE 4.1-mini para cálculo
    tokensInput: Math.ceil((usage.prompt_tokens || 0) * 1.25),
    tokensOutput: Math.ceil((usage.completion_tokens || 0) * 1.25),
    totalTokens: totalWithMargin,
    isEstimated: false,
    metadata: {
      originalModel: inputData.model || inputData.supervisorOutput?.model || 'gpt-4.1-mini',
      note: 'Dados reais com 25% de margem extra aplicada'
    }
  });
} else {
  // Estimar usando fórmula ajustada
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
        model: 'gpt-4.1-mini', // SEMPRE 4.1-mini
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
    // Valor mínimo com margem (aumentado para mensagens curtas)
    allUsageData.push({
      operation: 'chat',
      model: 'gpt-4.1-mini',
      tokensInput: 1875, // 1500 * 1.25
      tokensOutput: 3000, // Aumentado de 2000 para 3000 (mensagens curtas)
      totalTokens: 4875, // Aumentado de 4375 para 4875
      isEstimated: true,
      metadata: {
        note: 'Valor mínimo aumentado para mensagens curtas com 25% margem'
      }
    });
  }
}

// ============================================
// CAPTURAR ÁUDIO (se tiver)
// ============================================

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

// ============================================
// CAPTURAR IMAGEM (se tiver)
// ============================================

try {
  const imageData = inputData.imageData || inputData;
  const imageContent = imageData.content || '';
  
  if (imageContent && !inputData.usage?.duration) {
    // Estimar imagem com margem
    const estimatedTokens = Math.ceil((imageContent.length / 3.5) * 1.25); // +25%
    
    allUsageData.push({
      operation: 'image',
      model: 'gpt-4.1-mini', // SEMPRE 4.1-mini
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

## 📊 AJUSTES NA FÓRMULA

**Mudanças para mensagens curtas:**

| Tamanho | Ratio Antigo | Ratio Novo | Aumento |
|---------|--------------|------------|---------|
| ≤ 100 chars | 3.5 | **12.0** | +243% |
| ≤ 150 chars | 3.5 | **10.0** | +186% |
| ≤ 250 chars | 8.0 | **8.5** | +6% |
| ≤ 350 chars | 7.5 | 7.5 | - |
| > 350 chars | 6.5 | 6.5 | - |

**Isso garante que mensagens curtas não sejam subestimadas!**

---

## 🔧 CONFIGURAÇÃO HTTP REQUEST

### Opção 1: Array Completo (RECOMENDADO)

**Body (JSON):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageData }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**O backend já trata strings que começam com "=", então vai funcionar.**

### Opção 2: Se Não Funcionar, Usar JSON.stringify

**Body (JSON):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": {{ JSON.stringify($json._credits.allUsageData) }},
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

---

## 🧪 TESTE

1. **Atualize o código** do Code node com a versão ajustada
2. **Configure o HTTP Request** com o body corrigido
3. **Teste** com mensagem curta e veja se conta mais tokens
4. **Teste** com mensagem longa e veja se mantém
5. **Verifique** se o backend recebe o array corretamente

---

## ✅ RESUMO

**Ajustes feitos:**
- ✅ **Fórmula mais conservadora** para mensagens curtas (ratio 10-12x)
- ✅ **HTTP Request corrigido** - envia array completo
- ✅ **Mantém 25% margem** - cobre variações
- ✅ **Sempre modelo 4.1-mini** - equilibra

**Teste e me diga se está melhor!**

