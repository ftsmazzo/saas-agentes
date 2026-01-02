# ✅ SOLUÇÃO DEFINITIVA - Sem Acessar Outros Nodes

## 🎯 PROBLEMA

Acessar `$('Edit Fields2')` ou `$('Supervisor')` causa loop. **NÃO podemos acessar outros nodes no Code.**

## ✅ SOLUÇÃO: Set Node como Intermediário

**Passar todos os dados necessários pelo workflow usando Set node.**

---

## 🔧 PASSO A PASSO

### 1. Adicionar Set Node ANTES do Code

**Localização:** Entre o Supervisor e o Code

```
Supervisor → [NOVO] Set (Preparar Dados) → Code → HTTP Request
```

### 2. Configurar o Set Node

**Nome:** `Preparar Dados para Créditos`

**Campos:**

#### Campo 1: tenantId
- **Name:** `tenantId`
- **Value:** `={{ $('Edit Fields2').item.json.tenantId }}`

#### Campo 2: supervisorOutput
- **Name:** `supervisorOutput`
- **Value:** `={{ $json }}`

#### Campo 3: workflowId
- **Name:** `workflowId`
- **Value:** `={{ $workflow.id }}`

#### Campo 4: executionId
- **Name:** `executionId`
- **Value:** `={{ $execution.id }}`

---

### 3. Código do Code Node (SÓ USA INPUT)

**Cole este código no Code node (DEPOIS do Set):**

```javascript
// ============================================
// CÓDIGO FINAL - SÓ USA INPUT (NÃO ACESSA OUTROS NODES)
// ============================================

const inputData = $input.item.json;

// 1. Pegar tenantId do Set (vem do input agora)
const tenantId = inputData.tenantId || null;

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

// 2. Pegar dados do Supervisor (vem do Set)
const supervisorOutput = inputData.supervisorOutput || {};

// 3. Procurar usage em diferentes formatos
const usage = supervisorOutput.usage ||
              supervisorOutput.response?.usage ||
              supervisorOutput.output?.usage ||
              supervisorOutput.data?.usage ||
              supervisorOutput._usage ||
              null;

// 4. Preparar array de uso
const allUsageData = [];

if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
  const model = supervisorOutput.model ||
               supervisorOutput.response?.model ||
               supervisorOutput.output?.model ||
               'gpt-4o-mini';
  
  allUsageData.push({
    operation: 'chat',
    model: model,
    tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
    tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    metadata: {
      workflowId: inputData.workflowId || $workflow.id,
      nodeName: 'LangChain Supervisor',
      executionId: inputData.executionId || $execution.id
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

## 🔧 ALTERNATIVA: Se Supervisor Não Retorna Usage

Se o Supervisor não retorna usage na saída, precisamos **modificar o Supervisor** para incluir.

### Opção 1: Configurar Supervisor para Retornar Usage

No Supervisor, procure por:
- "Include Usage Data"
- "Return Full Response"
- "Output Format" → "Full Response"

**Ative essa opção.**

### Opção 2: Adicionar Post-Processing no Supervisor

Se o Supervisor tem opção de "Post-Processing" ou "Custom Output", adicione:

```javascript
// No post-processing do Supervisor
const response = $input.item.json;
const usage = response.usage || response.response?.usage || response.output?.usage;

return {
  ...response,
  usage: usage,
  tenantId: $('Edit Fields2').item.json.tenantId
};
```

---

## 🔧 VERSÃO SIMPLIFICADA - Só Registrar tenantId Primeiro

Se ainda não conseguir pegar usage, vamos pelo menos registrar o tenantId:

```javascript
// VERSÃO SIMPLES - Só tenantId por enquanto
const inputData = $input.item.json;

return {
  json: {
    tenantId: inputData.tenantId || null,
    allUsageData: [], // Vazio por enquanto
    timestamp: new Date().toISOString()
  }
};
```

**Isso pelo menos registra o tenantId. Depois ajustamos para pegar usage.**

---

## 🧪 TESTE PASSO A PASSO

### 1. Adicionar Set Node

1. **Depois do Supervisor**, adicione node **"Set"**
2. **Configure** os campos acima
3. **Salve**

### 2. Atualizar Code Node

1. **Cole o código** acima no Code
2. **Salve**

### 3. Testar

1. **Execute o workflow**
2. **Verifique** se não trava
3. **Veja o output** do Code

### 4. Se Funcionar

1. **Adicione HTTP Request** depois do Code
2. **Configure** a URL e body
3. **Teste** novamente

---

## 📋 CHECKLIST

- [ ] Adicionei Set node entre Supervisor e Code
- [ ] Configurei Set com tenantId e supervisorOutput
- [ ] Atualizei Code para só usar input
- [ ] Testei e não travou
- [ ] Verifiquei se pega tenantId
- [ ] Verifiquei se pega usage (se Supervisor retornar)

---

## 🆘 SE AINDA NÃO FUNCIONAR

### Verificar se Supervisor Retorna Usage

1. **Execute o workflow** até o Supervisor
2. **Veja o output** do Supervisor
3. **Procure** por campos como:
   - `usage`
   - `response.usage`
   - `output.usage`

**Se não tiver usage no output, o Supervisor precisa ser configurado para retornar.**

### Solução Temporária: Registrar Só tenantId

Pelo menos registrar o tenantId já é um progresso. Depois ajustamos para pegar usage.

---

## ✅ RESUMO

**A solução é:**
1. ✅ **Set node** passa dados (não acessa no Code)
2. ✅ **Code só usa input** (não acessa outros nodes)
3. ✅ **Não trava** (código linear simples)

**Teste esta solução e me diga o resultado!**

