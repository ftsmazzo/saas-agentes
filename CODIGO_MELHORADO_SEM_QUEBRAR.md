# ✅ Código Melhorado - Não Quebra, Captura Melhor

## 🎯 PROBLEMA

- Código novo quebrou (retorna zerado)
- Código antigo funciona mas não captura tokens reais
- N8N tem dados reais (4 mil tokens) mas não conseguimos acessar

## ✅ SOLUÇÃO: Melhorar Código Antigo

**Manter o que funciona e melhorar a captura gradualmente.**

---

## 🔧 CÓDIGO BASEADO NO QUE FUNCIONA

**Use este código (baseado no antigo que funciona):**

```javascript
// CÓDIGO MELHORADO - BASEADO NO QUE FUNCIONA
const inputData = $input.item.json;

const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { 
    json: { 
      ...inputData,
      _credits: { 
        tenantId: null, 
        allUsageData: [],
        error: "tenantId não encontrado"
      } 
    } 
  };
}

const allUsageData = [];

// ============================================
// TENTAR CAPTURAR USAGE REAL PRIMEIRO
// ============================================

// 1. Tentar pegar usage direto do input
const usage = inputData.usage || 
              inputData._usage ||
              inputData.supervisorOutput?.usage ||
              null;

// 2. Se encontrou usage real, usar
if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  allUsageData.push({
    operation: 'chat',
    model: inputData.model || 
           inputData.supervisorOutput?.model ||
           'gpt-4o-mini',
    tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
    tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
    totalTokens: usage.total_tokens || 
                 (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    isEstimated: false,
    metadata: {
      workflowId: inputData.workflowId || $workflow.id,
      nodeName: 'LangChain Supervisor',
      executionId: $execution.id
    }
  });
} else {
  // 3. Se não encontrou, usar estimativa melhorada
  // Pegar texto da resposta
  const responseText = inputData.output || 
                       inputData.text || 
                       inputData.supervisorOutput?.output ||
                       inputData.content ||
                       '';
  
  if (responseText) {
    // Estimativa melhorada: 1 token ≈ 3.5 caracteres (mais preciso)
    const estimatedOutput = Math.ceil(responseText.length / 3.5);
    
    // Input geralmente é 30-40% do output (prompt + contexto)
    const estimatedInput = Math.ceil(estimatedOutput * 0.35);
    
    // Adicionar margem de segurança de 20% (mais conservador)
    const totalEstimated = Math.ceil((estimatedInput + estimatedOutput) * 1.2);
    
    allUsageData.push({
      operation: 'chat',
      model: inputData.model || 'gpt-4o-mini',
      tokensInput: Math.ceil(totalEstimated * 0.35),
      tokensOutput: Math.ceil(totalEstimated * 0.65),
      totalTokens: totalEstimated,
      isEstimated: true,
      metadata: {
        workflowId: inputData.workflowId || $workflow.id,
        nodeName: 'LangChain Supervisor',
        executionId: $execution.id,
        note: 'Estimativa baseada em tamanho do texto (1 token ≈ 3.5 chars) + 20% margem',
        textLength: responseText.length
      }
    });
  } else {
    // 4. Se nem texto tiver, usar valor mínimo conservador
    allUsageData.push({
      operation: 'chat',
      model: inputData.model || 'gpt-4o-mini',
      tokensInput: 120,
      tokensOutput: 80,
      totalTokens: 200,
      isEstimated: true,
      metadata: {
        note: 'Valor mínimo conservador (sem dados disponíveis)'
      }
    });
  }
}

// ============================================
// RETORNAR RESULTADO
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

## 🔧 VERSÃO ULTRA-CONSERVADORA (Se Ainda Não Confiar)

**Se você não confia em estimativas, use valores fixos maiores:**

```javascript
// VERSÃO ULTRA-CONSERVADORA - Valores Fixos Altos
const inputData = $input.item.json;
const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return { json: { ...inputData, _credits: { tenantId: null, allUsageData: [] } } };
}

const allUsageData = [];

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
  // Se não tiver dados reais, usar valor fixo conservador
  // Baseado no que você viu (4 mil tokens), usar um valor médio-alto
  allUsageData.push({
    operation: 'chat',
    model: inputData.model || 'gpt-4o-mini',
    tokensInput: 2000, // Valor fixo conservador
    tokensOutput: 2000, // Valor fixo conservador
    totalTokens: 4000, // Valor fixo conservador (baseado no que você viu)
    isEstimated: true,
    metadata: {
      note: 'Valor fixo conservador - ajustar conforme necessário'
    }
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

## 💡 SOLUÇÃO DEFINITIVA: Modificar Supervisor

**O problema real é que o Supervisor não retorna usage. A única forma de ter dados reais é:**

### Opção 1: Configurar Supervisor para Retornar Usage

No Supervisor (LangChain Agent):
1. **Procure por "Output Format"** ou **"Return Full Response"**
2. **Ative** para retornar dados completos (não só texto)
3. **Ou procure por "Include Usage Data"** e ative

### Opção 2: Usar Post-Processing no Supervisor

Se o Supervisor tem "Post-Processing":

```javascript
// No post-processing do Supervisor
const response = $input.item.json;
const usage = response.usage || response.response?.usage;

return {
  text: response.text || response.output,
  usage: usage, // INCLUIR USAGE AQUI
  model: response.model || 'gpt-4o-mini',
  tenantId: $('Edit Fields2').item.json.tenantId
};
```

**Depois, o Set node passa tudo e o Code pega do input.**

---

## 🧪 TESTE

1. **Use o código melhorado** acima (baseado no que funciona)
2. **Teste** e veja se captura melhor
3. **Se não confiar**, use a versão ultra-conservadora com valores fixos
4. **Ou modifique o Supervisor** para incluir usage na saída

---

## 📋 PRÓXIMOS PASSOS

1. ✅ **Testar código melhorado** (estimativa melhor)
2. ✅ **OU usar versão conservadora** (valores fixos)
3. ✅ **OU modificar Supervisor** (dados reais)

**Qual você prefere tentar primeiro?**

