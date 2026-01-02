# ✅ Código Final - Com Margem Extra de 25%

## 🎯 AJUSTES SOLICITADOS

1. ✅ **Adicionar 25% de margem extra** (além da fórmula)
2. ✅ **Sempre usar modelo 4.1-mini** para cálculo (mesmo que seja outro)
3. ✅ **Equilibrar** mesmo com áudio e imagem

## ✅ SOLUÇÃO

---

## 🔧 CÓDIGO FINAL

**Cole este código no Code node:**

```javascript
// ============================================
// FÓRMULA COM MARGEM EXTRA DE 25% + MODELO FIXO
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

// Função baseada em dados reais + margem extra
function estimateTokensFromText(text) {
  if (!text || typeof text !== 'string') return null;
  
  const textLength = text.length;
  
  // Input fixo (baseado na análise: ~1500 tokens)
  const baseInputTokens = 1500;
  
  // Output: ratio baseado no tamanho do texto
  let outputRatio;
  
  if (textLength <= 150) {
    outputRatio = 3.5;
  } else if (textLength <= 250) {
    outputRatio = 8.0;
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
    model: 'gpt-4.1-mini', // SEMPRE 4.1-mini para cálculo (mesmo que seja outro)
    tokensInput: Math.ceil((usage.prompt_tokens || 0) * 1.25),
    tokensOutput: Math.ceil((usage.completion_tokens || 0) * 1.25),
    totalTokens: totalWithMargin,
    isEstimated: false, // Dados reais, mas com margem aplicada
    metadata: {
      originalModel: inputData.model || inputData.supervisorOutput?.model || 'gpt-4.1-mini',
      note: 'Dados reais com 25% de margem extra aplicada'
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
        model: 'gpt-4.1-mini', // SEMPRE 4.1-mini para cálculo
        tokensInput: estimation.tokensInput,
        tokensOutput: estimation.tokensOutput,
        totalTokens: estimation.totalTokens,
        isEstimated: true,
        metadata: {
          textLength: responseText.length,
          formula: 'Baseada em dados reais + 25% margem extra',
          originalModel: inputData.model || inputData.supervisorOutput?.model || 'gpt-4.1-mini',
          workflowId: inputData.workflowId || $workflow.id,
          nodeName: 'LangChain Supervisor',
          executionId: $execution.id
        }
      });
    }
  } else {
    // Valor mínimo com margem
    allUsageData.push({
      operation: 'chat',
      model: 'gpt-4.1-mini', // SEMPRE 4.1-mini
      tokensInput: 1875, // 1500 * 1.25
      tokensOutput: 2500, // 2000 * 1.25
      totalTokens: 4375, // 3500 * 1.25 (média com margem)
      isEstimated: true,
      metadata: {
        note: 'Valor médio com 25% de margem extra'
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
      model: 'gpt-4.1-mini', // SEMPRE 4.1-mini para cálculo
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

## 🎯 O QUE ESTE CÓDIGO FAZ

1. ✅ **Fórmula baseada em dados reais** - Usa a análise dos 6 exemplos
2. ✅ **+25% de margem extra** - Cobre reexecuções e variações
3. ✅ **Sempre modelo 4.1-mini** - Mesmo que seja outro modelo (equilibra)
4. ✅ **Captura áudio** - Usa duration real
5. ✅ **Captura imagem** - Estima com margem
6. ✅ **Não trava** - Só usa input

---

## 📊 EXEMPLO DE CÁLCULO

**Texto de 350 caracteres:**
- Fórmula base: 1500 + (350 * 7.5) = **4125 tokens**
- Com margem 25%: 4125 * 1.25 = **5156 tokens**
- Modelo usado: **gpt-4.1-mini** (mesmo que seja outro)

**Isso garante que você não perde dinheiro!**

---

## ✅ VANTAGENS

1. ✅ **Margem de segurança** - 25% extra cobre variações
2. ✅ **Modelo fixo** - Sempre 4.1-mini (preço consistente)
3. ✅ **Equilibra** - Mesmo com áudio/imagem, usa mesmo modelo
4. ✅ **Baseado em dados reais** - Não é chute

---

## 🧪 TESTE

1. **Cole o código** acima
2. **Teste** com diferentes tamanhos
3. **Verifique** se está registrando no banco
4. **Ajuste** a margem se necessário (pode aumentar para 30% se quiser mais segurança)

---

## ✅ RESUMO

**Solução final:**
- ✅ Fórmula baseada em dados reais
- ✅ +25% de margem extra
- ✅ Sempre modelo 4.1-mini para cálculo
- ✅ Equilibra mesmo com áudio/imagem

**Teste e me diga se está bom!**

