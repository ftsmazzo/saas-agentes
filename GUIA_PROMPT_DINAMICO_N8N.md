# 🎯 Guia: Implementar Prompt Dinâmico no Workflow N8N

## 📋 Objetivo

Substituir o prompt fixo (hardcoded) do node "Supervisor" por um prompt dinâmico que busca as configurações do agente da tabela `agentConfigs` no banco de dados, permitindo personalização única por tenant.

---

## 🔍 Situação Atual

### ❌ Problema Identificado

**Node:** "Supervisor" (linha 1168)  
**Localização:** Após "Postgres Chat Memory" e antes de "Split de mensagens"  
**Problema:** O campo `systemMessage` contém um prompt fixo e extenso (hardcoded) que não varia por tenant.

**Prompt atual está em:**
- `Supervisor` → `parameters` → `options` → `systemMessage`

---

## ✅ Solução: Prompt Dinâmico

### Estrutura da Solução

1. **Buscar Configurações do Agente** (novo node PostgreSQL)
2. **Criar Prompt Dinâmico** (novo node Code ou Set)
3. **Conectar ao Supervisor** (modificar node Supervisor)

---

## 📊 Fluxo Proposto

```
Webhook 
  → Edit Fields2 (extrai tenantId)
  → Select rows from a table (busca tenant)
  → Filter
  → [NOVO] Buscar Configurações Agente (PostgreSQL)
  → [NOVO] Criar Prompt Dinâmico (Code Node)
  → Info2
  → ... (resto do fluxo)
  → Supervisor (usa prompt dinâmico)
```

---

## 🔧 PASSO 1: Buscar Configurações do Agente

### Onde Inserir

**Localização:** Após o node "Select rows from a table" e antes do "Filter"

**Fluxo atual:**
```
Edit Fields2 → Select rows from a table → Filter → Info2
```

**Fluxo novo:**
```
Edit Fields2 → Select rows from a table → [NOVO] Buscar Configurações Agente → Filter → Info2
```

### Como Criar o Node

1. **Adicione um novo node PostgreSQL**
   - Tipo: `n8n-nodes-base.postgres`
   - Nome: `Buscar Configurações Agente`

2. **Configure a Query:**
   ```sql
   SELECT 
     "systemPrompt",
     "companyInfo",
     "welcomeMessage",
     "toolsConfig",
     "ragConfig"
   FROM "agentConfigs"
   WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
   LIMIT 1;
   ```

3. **Configure as Credenciais:**
   - Use a mesma credencial PostgreSQL: `POHa2nqjWojbkPsX` (Agents-Saas)

4. **Configure Opções:**
   - ✅ Marque "Always Output Data" (para não falhar se não houver config)
   - Isso garante que o workflow continue mesmo se o tenant não tiver configurações

### Resultado Esperado

O node retornará um objeto JSON com:
```json
{
  "systemPrompt": "Você é um assistente virtual...",
  "companyInfo": "{\"nome\": \"Empresa X\", \"setor\": \"...\"}",
  "welcomeMessage": "Olá! Como posso ajudar?",
  "toolsConfig": "{\"enabledTools\": [...]}",
  "ragConfig": "{\"enabled\": true, \"kbId\": \"...\"}"
}
```

---

## 🔧 PASSO 2: Criar Prompt Dinâmico

### Onde Inserir

**Localização:** Após "Buscar Configurações Agente" e antes de "Filter"

**Fluxo:**
```
Select rows from a table → Buscar Configurações Agente → [NOVO] Criar Prompt Dinâmico → Filter → Info2
```

### Opção A: Usar Code Node (RECOMENDADO)

**Vantagens:**
- Mais flexível para lógica complexa
- Pode processar JSON (companyInfo, toolsConfig, etc.)
- Pode ter fallback se não houver configurações

#### Como Criar

1. **Adicione um novo Code Node**
   - Tipo: `n8n-nodes-base.code`
   - Nome: `Criar Prompt Dinâmico`

2. **Cole o Código JavaScript:**

```javascript
// Buscar dados dos nodes anteriores
const tenantData = $('Select rows from a table').first().json;
const agentConfig = $('Buscar Configurações Agente').first().json;

// Extrair informações do tenant
const companyName = tenantData.companyName || tenantData["companyName"] || "a empresa";
const tenantId = $('Edit Fields2').first().json.tenantId;

// Extrair configurações do agente (com fallback)
const systemPrompt = agentConfig?.systemPrompt || agentConfig?.["systemPrompt"] || 
  `Você é um assistente virtual inteligente e prestativo da ${companyName}. 
Seu objetivo é ajudar os clientes de forma cordial, profissional e eficiente.`;

const companyInfo = agentConfig?.companyInfo || agentConfig?.["companyInfo"] || "{}";
let companyData = {};
try {
  companyData = typeof companyInfo === 'string' ? JSON.parse(companyInfo) : companyInfo;
} catch (e) {
  companyData = {};
}

// Construir prompt dinâmico
let dynamicPrompt = systemPrompt;

// Adicionar informações da empresa se disponíveis
if (companyData.nome || companyData.setor || companyData.descricao) {
  dynamicPrompt += `\n\n## Informações da Empresa\n`;
  if (companyData.nome) dynamicPrompt += `- **Nome:** ${companyData.nome}\n`;
  if (companyData.setor) dynamicPrompt += `- **Setor:** ${companyData.setor}\n`;
  if (companyData.descricao) dynamicPrompt += `- **Descrição:** ${companyData.descricao}\n`;
}

// Adicionar instruções sobre tools se configurado
const toolsConfig = agentConfig?.toolsConfig || agentConfig?.["toolsConfig"];
if (toolsConfig) {
  try {
    const tools = typeof toolsConfig === 'string' ? JSON.parse(toolsConfig) : toolsConfig;
    if (tools.enabledTools && tools.enabledTools.length > 0) {
      dynamicPrompt += `\n\n## Ferramentas Disponíveis\n`;
      dynamicPrompt += `Você tem acesso às seguintes ferramentas:\n`;
      tools.enabledTools.forEach(tool => {
        dynamicPrompt += `- **${tool.name}:** ${tool.description || ''}\n`;
      });
    }
  } catch (e) {
    // Ignorar erro de parsing
  }
}

// Retornar o prompt dinâmico
return [{
  json: {
    dynamicSystemPrompt: dynamicPrompt,
    tenantId: tenantId,
    companyName: companyName,
    hasConfig: !!agentConfig?.systemPrompt
  }
}];
```

3. **Configurações do Code Node:**
   - Mode: `Run Once for All Items`
   - Language: `JavaScript`

### Opção B: Usar Set Node (MAIS SIMPLES)

Se preferir uma solução mais simples sem processamento de JSON:

1. **Adicione um novo Set Node**
   - Tipo: `n8n-nodes-base.set`
   - Nome: `Criar Prompt Dinâmico`

2. **Configure os Campos:**

   **Campo 1:**
   - Name: `dynamicSystemPrompt`
   - Value: 
   ```
   ={{ $('Buscar Configurações Agente').item.json.systemPrompt || "Você é um assistente virtual inteligente e prestativo. Seu objetivo é ajudar os clientes de forma cordial, profissional e eficiente." }}
   ```

   **Campo 2 (Opcional - para debug):**
   - Name: `hasConfig`
   - Value: `={{ !!$('Buscar Configurações Agente').item.json.systemPrompt }}`

### Resultado Esperado

O node retornará:
```json
{
  "dynamicSystemPrompt": "Você é um assistente virtual... [prompt personalizado]",
  "tenantId": 10,
  "companyName": "Empresa X",
  "hasConfig": true
}
```

---

## 🔧 PASSO 3: Modificar Node Supervisor

### Onde Está

**Node:** "Supervisor" (linha 1168)  
**Tipo:** `@n8n/n8n-nodes-langchain.agent`

### Como Modificar

1. **Abra o node "Supervisor"**

2. **Localize o campo `systemMessage`**
   - Está em: `parameters` → `options` → `systemMessage`

3. **Substitua o conteúdo fixo por:**

   **Opção A (usando Code Node):**
   ```
   ={{ $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt }}
   ```

   **Opção B (usando Set Node):**
   ```
   ={{ $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt }}
   ```

4. **Salve o node**

### Antes vs Depois

**❌ ANTES (Fixo):**
```
systemMessage: "=## **1. Identidade e Propósito**\n\nVocê é **CaduIA**..."
```

**✅ DEPOIS (Dinâmico):**
```
systemMessage: "={{ $('Criar Prompt Dinâmico').item.json.dynamicSystemPrompt }}"
```

---

## 🔧 PASSO 4: Ajustar Conexões

### Verificar Fluxo

Certifique-se de que o fluxo está assim:

```
Edit Fields2
  ↓
Select rows from a table
  ↓
[NOVO] Buscar Configurações Agente
  ↓
[NOVO] Criar Prompt Dinâmico
  ↓
Filter
  ↓
Info2
  ↓
... (resto do fluxo)
  ↓
Supervisor (usa prompt dinâmico)
```

### Importante

- O node "Criar Prompt Dinâmico" deve estar **antes** do "Filter"
- O "Supervisor" pode continuar recebendo dados de outros nodes normalmente
- O prompt será carregado uma vez por execução do workflow

---

## 🧪 PASSO 5: Testar

### Teste 1: Tenant com Configurações

1. Certifique-se de que um tenant tem configurações na tabela `agentConfigs`
2. Execute o workflow
3. Verifique se o prompt usado no Supervisor é o da configuração

### Teste 2: Tenant sem Configurações

1. Use um tenant sem configurações (ou com `systemPrompt` NULL)
2. Execute o workflow
3. Verifique se usa o prompt padrão (fallback)

### Teste 3: Múltiplos Tenants

1. Teste com diferentes tenants
2. Verifique se cada um usa seu próprio prompt

---

## 📝 Estrutura do Prompt Dinâmico (Sugestão)

Se quiser criar um template de prompt mais estruturado, você pode usar este formato no Code Node:

```javascript
const systemPrompt = agentConfig?.systemPrompt || 
  `Você é um assistente virtual inteligente da ${companyName}.

## Sua Identidade
- Nome: Assistente Virtual da ${companyName}
- Objetivo: Ajudar clientes de forma cordial, profissional e eficiente

## Diretrizes
- Seja sempre educado e prestativo
- Responda de forma clara e objetiva
- Se não souber algo, seja honesto
- Mantenha o foco em ajudar o cliente

## Informações da Empresa
${companyData.nome ? `- Nome: ${companyData.nome}` : ''}
${companyData.setor ? `- Setor: ${companyData.setor}` : ''}
${companyData.descricao ? `- Descrição: ${companyData.descricao}` : ''}

## Ferramentas Disponíveis
[lista de tools se configurado]

Responda sempre em português brasileiro.`;

return [{ json: { dynamicSystemPrompt: systemPrompt } }];
```

---

## ⚠️ Considerações Importantes

### 1. Performance

- A busca de configurações adiciona uma query ao banco
- Isso é aceitável pois acontece uma vez por execução
- Considere cache se necessário (mas não é crítico agora)

### 2. Fallback

- Sempre tenha um prompt padrão caso não haja configurações
- O Code Node acima já inclui fallback

### 3. Validação

- Verifique se `tenantId` está disponível antes de buscar
- O node "Edit Fields2" deve estar funcionando corretamente

### 4. Ordem dos Nodes

- **CRÍTICO:** O "Criar Prompt Dinâmico" deve estar **antes** do "Supervisor"
- O Supervisor precisa do prompt antes de processar

---

## ✅ Checklist Final

Após implementar:

- [ ] Node "Buscar Configurações Agente" criado e configurado
- [ ] Node "Criar Prompt Dinâmico" criado (Code ou Set)
- [ ] Node "Supervisor" modificado para usar prompt dinâmico
- [ ] Conexões ajustadas corretamente
- [ ] Testado com tenant com configurações
- [ ] Testado com tenant sem configurações
- [ ] Verificado que cada tenant usa seu próprio prompt

---

## 🚀 Próximos Passos (Opcional)

Após implementar o prompt dinâmico básico, você pode:

1. **Adicionar mais campos ao prompt:**
   - `welcomeMessage` para personalizar saudações
   - `toolsConfig` para habilitar/desabilitar tools dinamicamente
   - `ragConfig` para configurar busca vetorial

2. **Criar templates de prompt:**
   - Diferentes templates por setor (imobiliária, e-commerce, etc.)
   - Aplicar template automaticamente baseado em `companyInfo.setor`

3. **Cache de configurações:**
   - Armazenar configurações em memória (Redis) para reduzir queries
   - Invalidar cache quando configurações forem atualizadas

---

## 📚 Referências

- Tabela `agentConfigs` no schema: `drizzle/schema.ts` (linha 123)
- Função `getAgentConfig` em: `server/db.ts` (linha 443)
- Endpoint de atualização: `server/routers.ts` (linha 1710)

---

**Pronto para implementar! 🎉**

Siga os passos na ordem e teste após cada etapa.

