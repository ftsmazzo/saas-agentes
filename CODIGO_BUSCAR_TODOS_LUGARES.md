# ✅ Código que Procura em Todos os Lugares

## 🎯 OBJETIVO

O código não está travando, mas não está encontrando os dados. Esta versão procura em TODOS os lugares possíveis.

---

## 🔧 CÓDIGO COMPLETO - Buscar em Todos os Lugares

**Cole este código no node Code:**

```javascript
// ============================================
// BUSCAR DADOS EM TODOS OS LUGARES POSSÍVEIS
// ============================================

const inputData = $input.item.json;

// Função para buscar valor em objeto aninhado de forma segura
function findValue(obj, paths) {
  for (const path of paths) {
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    let found = true;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }
    
    if (found && current !== null && current !== undefined) {
      return current;
    }
  }
  return null;
}

// ============================================
// 1. PROCURAR TENANTID EM TODOS OS LUGARES
// ============================================

const tenantId = inputData.tenantId ||
                 inputData.tenant_id ||
                 inputData.tenantID ||
                 inputData.id ||
                 findValue(inputData, [
                   ['data', 'tenantId'],
                   ['response', 'tenantId'],
                   ['output', 'tenantId'],
                   ['body', 'tenantId'],
                   ['result', 'tenantId'],
                   ['payload', 'tenantId'],
                   ['context', 'tenantId'],
                   ['metadata', 'tenantId']
                 ]) ||
                 null;

// ============================================
// 2. PROCURAR USAGE EM TODOS OS LUGARES
// ============================================

const usage = inputData.usage ||
              findValue(inputData, [
                ['response', 'usage'],
                ['output', 'usage'],
                ['data', 'usage'],
                ['body', 'usage'],
                ['result', 'usage'],
                ['payload', 'usage'],
                ['response', 'data', 'usage'],
                ['output', 'data', 'usage'],
                ['_usage'],
                ['usageData', 'usage']
              ]) ||
              null;

// ============================================
// 3. PROCURAR MODEL EM TODOS OS LUGARES
// ============================================

const model = inputData.model ||
              findValue(inputData, [
                ['response', 'model'],
                ['output', 'model'],
                ['data', 'model'],
                ['body', 'model'],
                ['result', 'model']
              ]) ||
              'gpt-4o-mini';

// ============================================
// 4. PREPARAR DADOS DE USO
// ============================================

const allUsageData = [];

if (usage) {
  // Verificar se tem tokens
  const tokensInput = usage.prompt_tokens || 
                     usage.input_tokens || 
                     usage.promptTokens ||
                     0;
  
  const tokensOutput = usage.completion_tokens || 
                      usage.output_tokens || 
                      usage.completionTokens ||
                      0;
  
  const totalTokens = usage.total_tokens || 
                     usage.totalTokens ||
                     (tokensInput + tokensOutput);
  
  // Se tem pelo menos alguns tokens, adicionar
  if (totalTokens > 0 || tokensInput > 0 || tokensOutput > 0) {
    allUsageData.push({
      operation: 'chat',
      model: model,
      tokensInput: tokensInput,
      tokensOutput: tokensOutput,
      totalTokens: totalTokens,
      metadata: {
        workflowId: $workflow.id,
        nodeName: 'LangChain Supervisor',
        executionId: $execution.id
      }
    });
  }
}

// ============================================
// 5. RETORNAR RESULTADO COM DEBUG
// ============================================

return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString(),
    // Debug info (remover depois)
    _debug: {
      foundTenantId: !!tenantId,
      foundUsage: !!usage,
      foundModel: model !== 'gpt-4o-mini',
      inputKeys: Object.keys(inputData),
      usageKeys: usage ? Object.keys(usage) : null,
      usageValue: usage
    }
  }
};
```

---

## 🔍 VERSÃO DEBUG - Ver Tudo

Se ainda não encontrar, use esta versão para ver o que está vindo:

```javascript
// DEBUG - Ver tudo que está vindo
const inputData = $input.item.json;

// Mostrar estrutura completa
return {
  json: {
    debug: true,
    inputKeys: Object.keys(inputData),
    inputData: inputData,
    
    // Tentar encontrar em vários lugares
    tenantId_direct: inputData.tenantId,
    tenantId_underscore: inputData.tenant_id,
    tenantId_id: inputData.id,
    
    usage_direct: inputData.usage,
    usage_response: inputData.response?.usage,
    usage_output: inputData.output?.usage,
    
    model_direct: inputData.model,
    model_response: inputData.response?.model,
    
    // Verificar se tem objetos aninhados
    hasResponse: !!inputData.response,
    hasOutput: !!inputData.output,
    hasData: !!inputData.data,
    hasBody: !!inputData.body
  }
};
```

---

## 💡 SOLUÇÃO ALTERNATIVA: Passar Dados pelo Workflow

Se os dados não estão vindo no input do Supervisor, precisamos **passá-los pelo workflow**.

### Opção 1: Usar Set Node Antes do Supervisor

1. **Antes do Supervisor**, adicione um node **"Set"**
2. **Configure** para passar o `tenantId`:
   - Name: `tenantId`
   - Value: `={{ $('Edit Fields2').item.json.tenantId }}`
3. **Conecte** o Set ao Supervisor
4. **No Supervisor**, o `tenantId` vai estar disponível

### Opção 2: Modificar o Supervisor para Incluir tenantId na Saída

Se o Supervisor tem opção de "Custom Output", adicione:

```javascript
// No output do Supervisor
{
  ...originalOutput,
  tenantId: $json.tenantId || $('Edit Fields2').item.json.tenantId
}
```

### Opção 3: Usar Merge Node

1. **Depois do Supervisor**, adicione um node **"Merge"**
2. **Configure** para juntar:
   - Dados do Supervisor (output)
   - Dados do Edit Fields2 (tenantId)
3. **Depois do Merge**, adicione o Code

---

## 🧪 TESTE

1. **Execute a versão "BUSCAR EM TODOS OS LUGARES"**
2. **Veja o campo `_debug`** no output
3. **Me envie:**
   - `foundTenantId`: true/false
   - `foundUsage`: true/false
   - `inputKeys`: quais chaves estão no input
   - `usageValue`: o que tem no usage (se encontrou)

---

## 📋 PRÓXIMOS PASSOS

1. **Se encontrar os dados** → Pronto! Funciona.
2. **Se não encontrar tenantId** → Precisamos passar pelo workflow (Set node)
3. **Se não encontrar usage** → O Supervisor pode não estar retornando usage na saída

**Execute e me envie o resultado do `_debug`!**

