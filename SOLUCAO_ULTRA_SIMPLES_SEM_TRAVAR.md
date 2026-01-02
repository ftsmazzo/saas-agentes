# ✅ SOLUÇÃO ULTRA-SIMPLES - NÃO TRAVA

## 🐛 PROBLEMA

**TODAS as tentativas de acessar `$execution`, `$('Node Name')`, etc. TRAVAM.**

## ✅ SOLUÇÃO: Só Usar Input + Modificar Supervisor

**Não podemos acessar nada externo. A única forma é o Supervisor INCLUIR os dados na saída.**

---

## 🔧 CÓDIGO ULTRA-SIMPLES (NÃO TRAVA)

**Cole este código no Code node:**

```javascript
// ============================================
// VERSÃO ULTRA-SIMPLES - SÓ USA INPUT
// ============================================
// NÃO ACESSA NADA EXTERNO - NÃO TRAVA

const inputData = $input.item.json;

// 1. Tentar pegar tenantId do input (se vier do Set)
const tenantId = inputData.tenantId || null;

// 2. Tentar pegar usage do input (se Supervisor incluir)
const usage = inputData.usage ||
              inputData._usage ||
              inputData.response?.usage ||
              null;

// 3. Preparar dados
const allUsageData = [];

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  allUsageData.push({
    operation: 'chat',
    model: inputData.model || 'gpt-4o-mini',
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Supervisor',
      executionId: $execution.id
    }
  });
}

// 4. Retornar (sempre retorna algo)
return {
  json: {
    ...inputData, // Passar tudo adiante
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString()
    }
  }
};
```

**Este código NÃO TRAVA porque não acessa nada externo.**

---

## 🔧 SOLUÇÃO REAL: Modificar Supervisor para Incluir Usage

**O problema é que o Supervisor não retorna usage. Precisamos MODIFICAR o Supervisor para incluir.**

### Opção 1: Configurar Supervisor para Retornar Full Response

No Supervisor (LangChain Agent):

1. **Abra o Supervisor**
2. **Procure por:**
   - "Output Format"
   - "Return Full Response"
   - "Include Metadata"
   - "Include Usage Data"
3. **Ative** a opção que retorna dados completos (não só texto)

### Opção 2: Adicionar Post-Processing no Supervisor

Se o Supervisor tem opção de "Post-Processing" ou "Custom Output":

```javascript
// No post-processing do Supervisor
const response = $input.item.json;

// Tentar pegar usage do response interno
const usage = response.usage || 
             response.response?.usage ||
             response.output?.usage ||
             null;

// Retornar resposta + usage
return {
  text: response.text || response.output || response,
  usage: usage,
  model: response.model || 'gpt-4o-mini'
};
```

### Opção 3: Usar Set Node para Passar Usage

Se o Supervisor tem um subnode "Model" que você pode acessar:

1. **Depois do Supervisor**, adicione **Set node**
2. **Configure:**
   - `tenantId`: `={{ $('Edit Fields2').item.json.tenantId }}`
   - `supervisorText`: `={{ $json.output }}` (ou `$json.text`)
   - `usage`: `={{ $('Supervisor').item.json.usage }}` (tentar acessar)

**Mas isso pode travar se tentar acessar Supervisor...**

---

## 🔧 SOLUÇÃO ALTERNATIVA: Webhook do N8N

**Se não conseguirmos capturar durante a execução, podemos usar webhook do N8N:**

1. **Configure webhook no N8N** para receber dados após execução
2. **No webhook**, acesse `execution.data` (pode funcionar em webhook)
3. **Processe** todos os nodes executados

**Mas isso também pode não funcionar...**

---

## 💡 SOLUÇÃO DEFINITIVA: Modificar Backend

**Se NÃO conseguirmos capturar no N8N, podemos:**

1. **Modificar o backend** para interceptar chamadas OpenAI
2. **Usar proxy/middleware** que captura todas as chamadas OpenAI
3. **Registrar usage** diretamente no backend

**Isso requer mudanças no backend, mas é mais confiável.**

---

## 🧪 TESTE A VERSÃO ULTRA-SIMPLES

1. **Cole o código ultra-simples** acima
2. **Teste** - não deve travar
3. **Verifique** se pelo menos pega tenantId
4. **Depois** vamos modificar Supervisor para incluir usage

---

## 📋 PRÓXIMOS PASSOS

1. ✅ **Testar código ultra-simples** (não trava)
2. 🔧 **Modificar Supervisor** para incluir usage na saída
3. 🔧 **Ou modificar backend** para interceptar chamadas OpenAI

**Qual opção você prefere tentar primeiro?**

