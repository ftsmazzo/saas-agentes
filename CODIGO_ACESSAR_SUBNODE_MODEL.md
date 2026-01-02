# ✅ Código para Acessar Subnode "Model" do Supervisor

## 🎯 PROBLEMA IDENTIFICADO

1. ✅ **tenantId** pode ser extraído de `$('Edit Fields2').item.json.tenantId`
2. ❌ **usage** está no subnode "Model" dentro do Supervisor (não na saída direta)
3. ✅ O Supervisor só retorna texto na saída

## ✅ SOLUÇÃO

Acessar o subnode "Model" do Supervisor para pegar os dados de uso.

---

## 🔧 CÓDIGO COMPLETO

**Cole este código no node Code após o Supervisor:**

```javascript
// ============================================
// ACESSAR SUBNODE MODEL DO SUPERVISOR
// ============================================

// 1. Pegar tenantId do Edit Fields2 (confirmado que funciona)
let tenantId = null;

try {
  const editFields = $('Edit Fields2');
  if (editFields && editFields.item && editFields.item.json) {
    tenantId = editFields.item.json.tenantId;
  }
} catch (e) {
  console.log('Erro ao buscar tenantId:', e.message);
}

// Se não encontrou, tentar do input
if (!tenantId) {
  const inputData = $input.item.json;
  tenantId = inputData.tenantId || 
             inputData.tenant_id || 
             inputData.id ||
             null;
}

if (!tenantId) {
  return {
    json: {
      tenantId: null,
      allUsageData: [],
      timestamp: new Date().toISOString(),
      error: "tenantId não encontrado"
    }
  };
}

// 2. Tentar acessar o subnode "Model" do Supervisor
const allUsageData = [];

try {
  // Tentar acessar o Supervisor
  const supervisor = $('Supervisor');
  
  if (supervisor && supervisor.item && supervisor.item.json) {
    // Tentar encontrar dados de uso no Supervisor
    const supervisorData = supervisor.item.json;
    
    // Procurar usage em diferentes formatos
    let usage = supervisorData.usage ||
                supervisorData.response?.usage ||
                supervisorData.output?.usage ||
                supervisorData.data?.usage;
    
    // Se não encontrou, tentar acessar o subnode "Model"
    if (!usage) {
      try {
        // Tentar acessar via $node com o nome completo
        const modelNode = $node["Supervisor"]?.json || 
                         $node["Model"]?.json ||
                         null;
        
        if (modelNode && modelNode.usage) {
          usage = modelNode.usage;
        }
      } catch (e) {
        // Ignorar erro
      }
    }
    
    // Se encontrou usage, adicionar
    if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
      const model = supervisorData.model ||
                   supervisorData.response?.model ||
                   supervisorData.output?.model ||
                   'gpt-4o-mini';
      
      allUsageData.push({
        operation: 'chat',
        model: model,
        tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
        tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'LangChain Supervisor - Model',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  console.log('Erro ao buscar usage do Supervisor:', e.message);
}

// 3. Retornar resultado
return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString(),
    _debug: {
      foundTenantId: !!tenantId,
      foundUsage: allUsageData.length > 0,
      usageCount: allUsageData.length
    }
  }
};
```

---

## 🔧 VERSÃO ALTERNATIVA - Acessar via $execution

Se o código acima não funcionar, tente esta versão que acessa via execution:

```javascript
// ============================================
// VERSÃO ALTERNATIVA - Via Execution
// ============================================

// 1. Pegar tenantId
let tenantId = null;

try {
  const editFields = $('Edit Fields2');
  if (editFields && editFields.item && editFields.item.json) {
    tenantId = editFields.item.json.tenantId;
  }
} catch (e) {
  // Ignorar
}

if (!tenantId) {
  return {
    json: {
      tenantId: null,
      allUsageData: [],
      timestamp: new Date().toISOString()
    }
  };
}

// 2. Tentar acessar dados do execution
const allUsageData = [];

try {
  // Tentar acessar dados do workflow execution
  const execution = $execution;
  
  // Procurar dados de uso nos nodes executados
  if (execution && execution.data && execution.data.resultData) {
    const resultData = execution.data.resultData;
    
    // Procurar no node Supervisor
    if (resultData.runData && resultData.runData.Supervisor) {
      const supervisorRuns = resultData.runData.Supervisor;
      
      // Pegar o último run
      if (supervisorRuns && supervisorRuns.length > 0) {
        const lastRun = supervisorRuns[supervisorRuns.length - 1];
        
        // Procurar usage no output do Supervisor
        if (lastRun.data && lastRun.data.main && lastRun.data.main.length > 0) {
          const mainData = lastRun.data.main[0];
          
          // Procurar usage em diferentes formatos
          const usage = mainData[0]?.json?.usage ||
                       mainData[0]?.json?.response?.usage ||
                       mainData[0]?.json?.output?.usage;
          
          if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
            const model = mainData[0]?.json?.model || 'gpt-4o-mini';
            
            allUsageData.push({
              operation: 'chat',
              model: model,
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
        }
      }
    }
  }
} catch (e) {
  console.log('Erro ao buscar via execution:', e.message);
}

return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString()
  }
};
```

---

## 🔧 VERSÃO MAIS SIMPLES - Só Registrar tenantId Primeiro

Se ainda não conseguir pegar o usage, vamos pelo menos registrar o tenantId e depois ajustamos:

```javascript
// ============================================
// VERSÃO SIMPLES - Só Registrar tenantId
// ============================================

// Pegar tenantId do Edit Fields2
let tenantId = null;

try {
  const editFields = $('Edit Fields2');
  if (editFields && editFields.item && editFields.item.json) {
    tenantId = editFields.item.json.tenantId;
  }
} catch (e) {
  // Ignorar
}

// Por enquanto, retornar só o tenantId
// Vamos ajustar para pegar usage depois
return {
  json: {
    tenantId: tenantId,
    allUsageData: [], // Vazio por enquanto
    timestamp: new Date().toISOString()
  }
};
```

---

## 💡 SOLUÇÃO DEFINITIVA: Modificar o Supervisor

Se o Supervisor não retorna usage na saída, podemos:

### Opção 1: Configurar o Supervisor para Incluir Usage

No Supervisor, verifique se há opção de "Include Usage Data" ou "Return Full Response" e ative.

### Opção 2: Usar Post-Processing no Supervisor

Se o Supervisor tem opção de "Post-Processing" ou "Custom Output", adicione:

```javascript
// No post-processing do Supervisor
const response = $input.item.json;
const usage = response.usage || response.response?.usage;

return {
  ...response,
  _usage: usage,
  tenantId: $('Edit Fields2').item.json.tenantId
};
```

### Opção 3: Adicionar Node Set Antes do Code

1. **Depois do Supervisor**, adicione um node **"Set"**
2. **Configure** para passar:
   - `tenantId`: `={{ $('Edit Fields2').item.json.tenantId }}`
   - `supervisorOutput`: `={{ $json }}`
3. **Depois do Set**, adicione o Code
4. **No Code**, use `$json.supervisorOutput` para acessar dados do Supervisor

---

## 🧪 TESTE

1. **Teste a primeira versão** (acessar subnode Model)
2. **Se não funcionar**, teste a versão via `$execution`
3. **Se ainda não funcionar**, use a versão simples que só registra tenantId
4. **Me envie o resultado** e ajustamos

---

## 📋 PRÓXIMOS PASSOS

1. **Se conseguir pegar usage** → Pronto!
2. **Se não conseguir** → Vamos modificar o Supervisor ou usar Set node
3. **Pelo menos registrar tenantId** → Já é um progresso

**Teste e me envie o resultado!**

