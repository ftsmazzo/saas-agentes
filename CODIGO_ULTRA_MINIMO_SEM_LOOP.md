# ✅ Código Ultra-Mínimo - SEM LOOP

## 🐛 PROBLEMA

O código anterior ainda está causando loop, mesmo com try/catch. Isso acontece porque tentar acessar outros nodes (`$('Node Name')`) pode causar problemas no N8N.

## ✅ SOLUÇÃO: Só Usar Input Direto

Este código **NÃO tenta acessar nenhum node anterior**. Só usa o que vem no `$input.item.json`.

---

## 🔧 CÓDIGO ULTRA-MÍNIMO

**Cole este código no node "Code" após o Supervisor:**

```javascript
// ============================================
// VERSÃO ULTRA-MÍNIMA - SEM ACESSAR OUTROS NODES
// ============================================
// Este código NÃO tenta acessar outros nodes
// Só usa dados do input direto

// 1. Pegar dados do input (vem do Supervisor)
const inputData = $input.item.json;

// 2. Tentar encontrar tenantId no input
let tenantId = inputData.tenantId || null;

// 3. Se não encontrou, tentar extrair de outros campos do input
if (!tenantId) {
  // Tentar campos comuns
  tenantId = inputData.tenant_id || 
             inputData.tenantID ||
             inputData.id ||
             null;
}

// 4. Se ainda não encontrou, usar um valor padrão ou retornar vazio
// IMPORTANTE: Não tenta acessar outros nodes!
if (!tenantId) {
  // Retornar estrutura vazia mas válida
  return {
    json: {
      tenantId: null,
      allUsageData: [],
      timestamp: new Date().toISOString(),
      error: "tenantId não encontrado no input"
    }
  };
}

// 5. Tentar extrair dados de uso do input
const allUsageData = [];

// Tentar encontrar usage em diferentes formatos no input
const usage = inputData.usage || 
              inputData.response?.usage ||
              inputData.output?.usage ||
              inputData._usage ||
              {};

// Se encontrou usage, adicionar
if (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens) {
  const model = inputData.model || 
                inputData.response?.model ||
                inputData.output?.model ||
                'gpt-4o-mini';
  
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

// 6. Retornar resultado (SEMPRE retorna - nunca fica em loop)
return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString(),
    totalItems: allUsageData.length
  }
};
```

---

## 🔧 VERSÃO AINDA MAIS SIMPLES (SE AINDA TRAVAR)

Se ainda travar, use esta versão que **só retorna o que recebe**:

```javascript
// VERSÃO EXTREMA - SÓ PASSA ADIANTE
// Não processa nada, só adiciona campos necessários

const inputData = $input.item.json;

// Tentar pegar tenantId do input
const tenantId = inputData.tenantId || 
                 inputData.tenant_id || 
                 inputData.id ||
                 null;

// Retornar estrutura mínima
return {
  json: {
    ...inputData, // Passar tudo que veio
    tenantId: tenantId,
    allUsageData: inputData.usage ? [{
      operation: 'chat',
      model: inputData.model || 'gpt-4o-mini',
      tokensInput: inputData.usage.prompt_tokens || 0,
      tokensOutput: inputData.usage.completion_tokens || 0,
      totalTokens: inputData.usage.total_tokens || 0
    }] : [],
    timestamp: new Date().toISOString()
  }
};
```

---

## 🔧 VERSÃO HARDCODED (PARA TESTAR)

Se quiser testar sem depender de dados, use esta versão:

```javascript
// VERSÃO HARDCODED - SÓ PARA TESTAR
// Substitua 39 pelo ID do seu tenant

const tenantId = 39; // HARDCODED - substituir pelo ID real

return {
  json: {
    tenantId: tenantId,
    allUsageData: [{
      operation: 'chat',
      model: 'gpt-4o-mini',
      tokensInput: 100, // Valores de teste
      tokensOutput: 50,
      totalTokens: 150
    }],
    timestamp: new Date().toISOString()
  }
};
```

**Depois que funcionar, vamos ajustando para pegar dados reais.**

---

## 🔧 CONFIGURAÇÃO DO HTTP REQUEST

**Depois do Code, configure o HTTP Request assim:**

### URL:
```
http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json.tenantId || 39 }}
```

### Method:
```
POST
```

### Body Content Type:
```
JSON
```

### Body (JSON):
```json
{
  "eventType": "usage_tracking_batch",
  "data": {{ $json.allUsageData }},
  "timestamp": "{{ $json.timestamp }}"
}
```

### Options:
- ✅ **Continue On Fail:** `TRUE`
- ✅ **Response:** `Last Node Output`

---

## 🎯 POR QUE ESTA VERSÃO NÃO TRAVA

1. **Não acessa outros nodes** - só usa `$input.item.json`
2. **Não usa `$('Node Name')`** - isso pode causar loop
3. **Sempre retorna** - nunca fica esperando
4. **Código mínimo** - menos chance de erro
5. **Sem loops ou recursão** - código linear simples

---

## 🧪 TESTE PASSO A PASSO

### 1. Teste com Versão Hardcoded Primeiro

1. Cole a versão hardcoded no Code
2. Substitua `39` pelo ID do seu tenant
3. Execute o workflow
4. Verifique se não trava
5. Verifique se chega no backend

### 2. Se Funcionar, Use Versão com Input

1. Troque para a versão que usa `$input.item.json`
2. Execute novamente
3. Verifique se captura os dados corretos

### 3. Se Ainda Travar

1. Use a versão "SÓ PASSA ADIANTE"
2. Verifique o que está vindo no input
3. Me envie o que aparece no output do Code

---

## 🔍 DEBUG: Ver o que está vindo no Input

Se quiser ver o que está vindo no input, use este código temporário:

```javascript
// DEBUG - Ver o que está vindo
const inputData = $input.item.json;

// Retornar tudo para ver no output
return {
  json: {
    debug: true,
    inputKeys: Object.keys(inputData),
    inputData: inputData,
    tenantId: inputData.tenantId,
    hasUsage: !!inputData.usage,
    usage: inputData.usage
  }
};
```

**Execute e veja o que aparece no output do Code. Isso vai ajudar a entender o formato dos dados.**

---

## ⚠️ IMPORTANTE

### O que NÃO fazer:

- ❌ **NÃO usar `$('Node Name')`** - pode causar loop
- ❌ **NÃO tentar acessar nodes anteriores** - pode travar
- ❌ **NÃO fazer loops ou recursão** - pode travar
- ❌ **NÃO esperar dados que podem não existir** - pode travar

### O que fazer:

- ✅ **Só usar `$input.item.json`** - dados diretos
- ✅ **Sempre retornar algo** - nunca ficar sem retorno
- ✅ **Código linear simples** - fácil de debugar
- ✅ **Testar com hardcoded primeiro** - garantir que funciona

---

## 🆘 SE AINDA TRAVAR

1. **Use a versão hardcoded** para garantir que o HTTP Request funciona
2. **Verifique se o HTTP Request está configurado corretamente**
3. **Teste o endpoint manualmente** (Postman/curl)
4. **Me envie:**
   - O código que você está usando
   - O que aparece nos logs do N8N
   - O que aparece no output do Code (se conseguir ver)

---

## ✅ RESUMO

**Use esta ordem de teste:**

1. **Versão Hardcoded** → Garantir que HTTP Request funciona
2. **Versão Debug** → Ver o que vem no input
3. **Versão com Input** → Capturar dados reais
4. **Ajustar conforme necessário**

**O segredo é: NÃO ACESSAR OUTROS NODES! Só usar `$input.item.json`.**

