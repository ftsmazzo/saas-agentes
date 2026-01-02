# 🔍 Debug: Ver o que está vindo no Input

## ✅ PROGRESSO

O código não está travando mais! Mas não está encontrando os dados. Vamos debugar.

---

## 🔧 VERSÃO DEBUG - Ver o que está vindo

**Cole este código no node Code para ver o que está vindo:**

```javascript
// ============================================
// DEBUG - Ver tudo que está vindo no input
// ============================================

const inputData = $input.item.json;

// Retornar tudo para ver no output
return {
  json: {
    // Informações de debug
    debug: true,
    inputKeys: Object.keys(inputData),
    inputKeysCount: Object.keys(inputData).length,
    
    // Dados completos do input
    inputData: inputData,
    
    // Tentar encontrar tenantId em vários lugares
    tenantId_direct: inputData.tenantId,
    tenantId_underscore: inputData.tenant_id,
    tenantId_upper: inputData.tenantID,
    tenantId_id: inputData.id,
    
    // Tentar encontrar usage em vários lugares
    hasUsage: !!inputData.usage,
    hasUsageResponse: !!inputData.response?.usage,
    hasUsageOutput: !!inputData.output?.usage,
    
    // Mostrar usage se existir
    usage: inputData.usage,
    usageResponse: inputData.response?.usage,
    usageOutput: inputData.output?.usage,
    
    // Mostrar model se existir
    model: inputData.model,
    modelResponse: inputData.response?.model,
    modelOutput: inputData.output?.model,
    
    // Informações do workflow
    workflowId: $workflow.id,
    executionId: $execution.id
  }
};
```

---

## 🧪 TESTE

1. **Cole este código** no node Code
2. **Execute o workflow**
3. **Veja o output do Code**
4. **Me envie o que apareceu** (especialmente as chaves e os valores de tenantId e usage)

---

## 🔧 VERSÃO ALTERNATIVA - Ver estrutura completa

Se o output for muito grande, use esta versão que mostra só a estrutura:

```javascript
// DEBUG - Ver estrutura sem valores grandes
const inputData = $input.item.json;

// Função para mostrar estrutura de um objeto
function getStructure(obj, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return '...';
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return typeof obj;
  
  const result = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = getStructure(obj[key], depth + 1, maxDepth);
    } else {
      result[key] = typeof obj[key];
    }
  }
  return result;
}

return {
  json: {
    debug: true,
    inputStructure: getStructure(inputData),
    inputKeys: Object.keys(inputData),
    
    // Valores específicos que procuramos
    tenantId: inputData.tenantId,
    usage: inputData.usage ? 'EXISTS' : 'NOT FOUND',
    model: inputData.model,
    
    // Verificar se tem nested objects
    hasResponse: !!inputData.response,
    hasOutput: !!inputData.output,
    hasData: !!inputData.data
  }
};
```

---

## 📋 O QUE PROCURAR NO OUTPUT

Depois de executar, me envie:

1. **Quais são as chaves principais?** (inputKeys)
2. **Onde está o tenantId?** (em qual chave?)
3. **Onde está o usage?** (em qual chave? usage, response.usage, output.usage?)
4. **Onde está o model?** (em qual chave?)
5. **Há objetos aninhados?** (response, output, data?)

---

## 🔧 VERSÃO QUE PROCURA EM TODOS OS LUGARES

Enquanto isso, use esta versão que procura em TODOS os lugares possíveis:

```javascript
// ============================================
// VERSÃO QUE PROCURA EM TODOS OS LUGARES
// ============================================

const inputData = $input.item.json;

// Função para buscar valor em objeto aninhado
function findValue(obj, keys) {
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }
  return current;
}

// Procurar tenantId em vários lugares
const tenantId = inputData.tenantId ||
                 inputData.tenant_id ||
                 inputData.tenantID ||
                 inputData.id ||
                 findValue(inputData, ['data', 'tenantId']) ||
                 findValue(inputData, ['response', 'tenantId']) ||
                 findValue(inputData, ['output', 'tenantId']) ||
                 findValue(inputData, ['body', 'tenantId']) ||
                 null;

// Procurar usage em vários lugares
const usage = inputData.usage ||
              findValue(inputData, ['response', 'usage']) ||
              findValue(inputData, ['output', 'usage']) ||
              findValue(inputData, ['data', 'usage']) ||
              findValue(inputData, ['body', 'usage']) ||
              findValue(inputData, ['result', 'usage']) ||
              null;

// Procurar model em vários lugares
const model = inputData.model ||
              findValue(inputData, ['response', 'model']) ||
              findValue(inputData, ['output', 'model']) ||
              findValue(inputData, ['data', 'model']) ||
              'gpt-4o-mini';

// Preparar array de uso
const allUsageData = [];

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  allUsageData.push({
    operation: 'chat',
    model: model,
    tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
    tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Supervisor',
      executionId: $execution.id
    }
  });
}

// Retornar resultado com debug
return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString(),
    // Debug info
    debug: {
      foundTenantId: !!tenantId,
      foundUsage: !!usage,
      foundModel: !!model,
      usageKeys: usage ? Object.keys(usage) : [],
      inputKeys: Object.keys(inputData)
    }
  }
};
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Execute a versão DEBUG** e me envie o output
2. **Ou execute a versão "PROCURA EM TODOS OS LUGARES"** e veja se encontra
3. **Me envie o resultado** para ajustarmos

---

## 💡 DICA

Se o tenantId não estiver vindo no input do Supervisor, pode estar vindo de um node anterior. Nesse caso, precisamos:

1. **Passar o tenantId pelo workflow** (usar Set node antes do Supervisor)
2. **Ou buscar do banco** (PostgreSQL node antes do Supervisor)
3. **Ou extrair do webhook** (mas sem usar `$('Webhook')` - passar pelo workflow)

**Me envie o output do debug e vamos ajustar!**

