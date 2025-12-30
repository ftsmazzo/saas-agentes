# 🔧 Correção: Erro no Code Node "Criar Prompt Dinâmico"

## ❌ Erro Identificado

```
Error: Referenced node doesn't exist
Cannot assign to read only property 'name' of object
```

## 🔍 Causa do Problema

O código estava tentando acessar um node que **não existe** ou **não está acessível**:

```javascript
// ❌ PROBLEMA: Este node pode não existir ou ter nome diferente
const tenantData = $('Select rows from a table').first().json;
```

Além disso, havia uma linha **incompleta** no código:

```javascript
// ❌ PROBLEMA: Linha incompleta
const companyInfo = agentConfig?.companyInfo || agentConfig?.`
```

---

## ✅ Solução: Código Corrigido

### Código Completo para o Code Node

**Arquivo:** `CODIGO_CORRIGIDO_PROMPT_DINAMICO.js`

**Use este código no Code Node "Criar Prompt Dinâmico":**

```javascript
// Buscar dados dos nodes anteriores
// IMPORTANTE: Use apenas nodes que existem e estão conectados
const agentConfig = $('Buscar Configurações Agente').first().json;
const editFields2 = $('Edit Fields2').first().json;

// Extrair tenantId
const tenantId = editFields2?.tenantId || null;

// Extrair configurações do agente (com fallback)
const systemPrompt = agentConfig?.systemPrompt || agentConfig?.["systemPrompt"] || 
  `Você é um assistente virtual inteligente e prestativo.
Seu objetivo é ajudar os clientes de forma cordial, profissional e eficiente.`;

// Extrair companyInfo (pode ser string JSON ou objeto)
let companyInfo = agentConfig?.companyInfo || agentConfig?.["companyInfo"] || "{}";
let companyData = {};

// Tentar parsear companyInfo se for string
try {
  if (typeof companyInfo === 'string') {
    companyData = JSON.parse(companyInfo);
  } else {
    companyData = companyInfo;
  }
} catch (e) {
  // Se falhar, usar objeto vazio
  companyData = {};
}

// Extrair nome da empresa (de várias fontes possíveis)
const companyName = companyData?.name || companyData?.nome || "a empresa";

// Construir prompt dinâmico
let dynamicPrompt = systemPrompt;

// Adicionar informações da empresa se disponíveis
if (companyData && Object.keys(companyData).length > 0) {
  dynamicPrompt += `\n\n## Informações da Empresa\n`;
  
  if (companyData.name || companyData.nome) {
    dynamicPrompt += `- **Nome:** ${companyData.name || companyData.nome}\n`;
  }
  
  if (companyData.setor) {
    dynamicPrompt += `- **Setor:** ${companyData.setor}\n`;
  }
  
  if (companyData.descricao || companyData.description) {
    dynamicPrompt += `- **Descrição:** ${companyData.descricao || companyData.description}\n`;
  }
  
  if (companyData.address || companyData.endereco) {
    dynamicPrompt += `- **Endereço:** ${companyData.address || companyData.endereco}\n`;
  }
  
  if (companyData.phone || companyData.telefone) {
    dynamicPrompt += `- **Telefone:** ${companyData.phone || companyData.telefone}\n`;
  }
}

// Adicionar instruções sobre tools se configurado
const toolsConfig = agentConfig?.toolsConfig || agentConfig?.["toolsConfig"];
if (toolsConfig) {
  try {
    const tools = typeof toolsConfig === 'string' ? JSON.parse(toolsConfig) : toolsConfig;
    if (tools.enabledTools && Array.isArray(tools.enabledTools) && tools.enabledTools.length > 0) {
      dynamicPrompt += `\n\n## Ferramentas Disponíveis\n`;
      dynamicPrompt += `Você tem acesso às seguintes ferramentas:\n`;
      tools.enabledTools.forEach(tool => {
        const toolName = tool.name || tool;
        const toolDesc = tool.description || '';
        dynamicPrompt += `- **${toolName}:** ${toolDesc}\n`;
      });
    }
  } catch (e) {
    // Ignorar erro de parsing de tools
  }
}

// Retornar o prompt dinâmico
return [{
  json: {
    dynamicSystemPrompt: dynamicPrompt,
    tenantId: tenantId,
    companyName: companyName,
    hasConfig: !!agentConfig?.systemPrompt,
    originalSystemPrompt: systemPrompt
  }
}];
```

---

## 🔧 Como Aplicar a Correção

### Passo 1: Abrir o Code Node

1. Abra o node "Criar Prompt Dinâmico" no N8N
2. Vá para a aba "Parameters"
3. Localize o campo de código JavaScript

### Passo 2: Substituir o Código

1. **Delete todo o código antigo**
2. **Cole o código corrigido** acima
3. **Salve o node**

### Passo 3: Verificar Conexões

Certifique-se de que os nodes estão conectados nesta ordem:

```
Edit Fields2
  ↓
Buscar Configurações Agente
  ↓
Criar Prompt Dinâmico ← [USE O CÓDIGO CORRIGIDO]
  ↓
Filter
```

### Passo 4: Testar

1. Execute o workflow
2. Verifique se o node "Criar Prompt Dinâmico" executa sem erros
3. Verifique o OUTPUT do node - deve mostrar:
   ```json
   {
     "dynamicSystemPrompt": "...",
     "tenantId": 10,
     "companyName": "ImobMiq",
     "hasConfig": true
   }
   ```

---

## 🔍 Mudanças Principais

### ❌ Removido (causava erro)

```javascript
// ❌ REMOVIDO: Node pode não existir
const tenantData = $('Select rows from a table').first().json;
```

### ✅ Adicionado (mais seguro)

```javascript
// ✅ USAR: Apenas nodes que sabemos que existem
const agentConfig = $('Buscar Configurações Agente').first().json;
const editFields2 = $('Edit Fields2').first().json;
```

### ✅ Corrigido (linha incompleta)

```javascript
// ❌ ANTES (incompleto):
const companyInfo = agentConfig?.companyInfo || agentConfig?.`

// ✅ DEPOIS (completo):
let companyInfo = agentConfig?.companyInfo || agentConfig?.["companyInfo"] || "{}";
```

---

## 📊 Nodes Necessários

O código corrigido usa **apenas** estes nodes:

1. ✅ **"Edit Fields2"** - Para pegar `tenantId`
2. ✅ **"Buscar Configurações Agente"** - Para pegar `systemPrompt`, `companyInfo`, etc.

**Não precisa mais de:**
- ❌ "Select rows from a table" (removido do código)

---

## 🧪 Teste Rápido

Após aplicar a correção, execute o workflow e verifique:

1. **No OUTPUT do "Criar Prompt Dinâmico":**
   - Deve ter `dynamicSystemPrompt` com o prompt montado
   - Deve ter `tenantId` correto
   - Deve ter `companyName` (ex: "ImobMiq")
   - Deve ter `hasConfig: true` se houver configurações

2. **No node "Supervisor":**
   - O campo `systemMessage` deve usar: `={{ $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt }}`
   - O prompt deve ser personalizado com as informações da empresa

---

## ⚠️ Se Ainda Der Erro

### Verificar Nomes dos Nodes

Se ainda der erro "Referenced node doesn't exist", verifique:

1. **Nome exato do node "Edit Fields2":**
   - Deve ser exatamente: `Edit Fields2`
   - Verifique se não tem espaços extras ou diferenças

2. **Nome exato do node "Buscar Configurações Agente":**
   - Deve ser exatamente: `Buscar Configurações Agente`
   - Verifique se não tem espaços extras ou diferenças

3. **Conexões:**
   - "Edit Fields2" deve estar conectado antes de "Buscar Configurações Agente"
   - "Buscar Configurações Agente" deve estar conectado antes de "Criar Prompt Dinâmico"

### Versão Simplificada (Se Necessário)

Se ainda tiver problemas, use esta versão **ultra simplificada**:

```javascript
// Versão simplificada - apenas o essencial
const agentConfig = $('Buscar Configurações Agente').first().json;

const systemPrompt = agentConfig?.systemPrompt || 
  `Você é um assistente virtual inteligente e prestativo.
Seu objetivo é ajudar os clientes de forma cordial, profissional e eficiente.`;

return [{
  json: {
    dynamicSystemPrompt: systemPrompt,
    hasConfig: !!agentConfig?.systemPrompt
  }
}];
```

---

**Aplique a correção e teste novamente! 🚀**

