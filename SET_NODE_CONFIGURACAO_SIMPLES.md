# ✅ Configuração Simples do Set Node

## 🎯 CONFIGURAÇÃO MÍNIMA

**Você só precisa de 2 campos no Set node:**

---

## 🔧 SET NODE - Configuração

**Nome:** `Preparar Dados para Créditos`

### Campo 1: tenantId
- **Name:** `tenantId`
- **Value:** `={{ $('Edit Fields2').item.json.tenantId }}`

### Campo 2: supervisorOutput
- **Name:** `supervisorOutput`
- **Value:** `={{ $json }}`

**Só isso!** Os outros campos (workflowId e executionId) são opcionais.

---

## 🔧 CÓDIGO DO CODE NODE (Atualizado)

**Cole este código no Code node:**

```javascript
// CÓDIGO SIMPLIFICADO - SÓ USA INPUT
const inputData = $input.item.json;

// 1. Pegar tenantId (vem do Set)
const tenantId = inputData.tenantId || null;

if (!tenantId) {
  return {
    json: {
      tenantId: null,
      allUsageData: [],
      timestamp: new Date().toISOString()
    }
  };
}

// 2. Pegar dados do Supervisor (vem do Set)
const supervisorOutput = inputData.supervisorOutput || {};

// 3. Procurar usage
const usage = supervisorOutput.usage ||
              supervisorOutput.response?.usage ||
              supervisorOutput.output?.usage ||
              null;

// 4. Preparar array de uso
const allUsageData = [];

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  allUsageData.push({
    operation: 'chat',
    model: supervisorOutput.model || 'gpt-4o-mini',
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    metadata: {
      workflowId: $workflow.id, // Pega direto aqui
      nodeName: 'LangChain Supervisor',
      executionId: $execution.id // Pega direto aqui
    }
  });
}

// 5. Retornar resultado
return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString()
  }
};
```

---

## ✅ RESUMO

**Set Node precisa de apenas 2 campos:**
1. ✅ `tenantId` = `={{ $('Edit Fields2').item.json.tenantId }}`
2. ✅ `supervisorOutput` = `={{ $json }}`

**O Code node pega `$workflow.id` e `$execution.id` diretamente** (não precisa passar pelo Set).

---

## 🧪 TESTE

1. **Configure o Set** com só esses 2 campos
2. **Cole o código** no Code
3. **Execute** e veja se funciona

**Muito mais simples assim!**

