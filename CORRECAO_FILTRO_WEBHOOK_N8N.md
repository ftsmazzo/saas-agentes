# Correção do Filtro de Webhook no N8N

## 🎯 Problema Identificado

O workflow do N8N tem um **filtro de segurança** no início que verifica se o webhook pertence ao agente correto. Atualmente ele está:

1. ❌ Buscando `evolutionInstanceName` na tabela `tenants` (campo não existe mais lá)
2. ❌ Comparando com formato antigo `tenant_${tenantId}`
3. ❌ Não funciona com múltiplos agentes
4. ❌ **NOVO PROBLEMA:** Webhook no Chatwoot usa `agent_14`, N8N usa `tenant_52`, Evolution usa `tenant_52` - tudo desalinhado!

## ✅ Formato Padronizado

**Agora todos os webhooks usam:** `/webhook/tenant_${tenantId}/agent_${agentId}`

Isso agrega empresa e agente, facilitando identificação e segurança.

## ✅ Solução

### 1. Atualizar Query "Select rows from a table"

**Node:** `Select rows from a table` (linha ~2024)

**Problema Atual:**
```json
{
  "table": "tenants",
  "where": {
    "column": "evolutionInstanceName",
    "value": "={{ $json.webhookUrl.trim() }}"
  }
}
```

**Correção (Opção 1 - Buscar por evolutionInstanceName):**
```json
{
  "table": "agents",
  "where": {
    "values": [
      {
        "column": "evolutionInstanceName",
        "value": "={{ $json.webhookPath || $json.webhookUrl.split('/').pop() }}"
      }
    ]
  }
}
```

**Correção (Opção 2 - Buscar por agentId extraído da URL - RECOMENDADO):**
```json
{
  "operation": "executeQuery",
  "query": "SELECT * FROM agents WHERE id = {{ $json.agentId }} OR evolutionInstanceName = '{{ $json.webhookPath }}' LIMIT 1;"
}
```

**OU usando WHERE do node:**
```json
{
  "table": "agents",
  "where": {
    "values": [
      {
        "column": "id",
        "value": "={{ $json.agentId || null }}"
      }
    ]
  }
}
```

**Nota:** Se `agentId` for `null` (formato antigo `tenant_`), buscar por `evolutionInstanceName`:
```json
{
  "table": "agents",
  "where": {
    "values": [
      {
        "column": "evolutionInstanceName",
        "value": "={{ $json.webhookPath }}"
      }
    ]
  }
}
```

### 2. Atualizar Node "Edit Fields2"

**Node:** `Edit Fields2` (linha ~2015)

**Adicionar extração de `agentId`:**

```json
{
  "assignments": {
    "assignments": [
      {
        "id": "...",
        "name": "webhookUrl",
        "value": "={{$json.webhookUrl.split('/').pop().replace(/\\s+/g, '') }}",
        "type": "string"
      },
      {
        "id": "...",
        "name": "webhookPath",
        "value": "={{$json.webhookUrl.split('/').pop().replace(/\\s+/g, '') }}",
        "type": "string"
      },
      {
        "id": "...",
        "name": "agentId",
        "value": "={{$json.webhookUrl ? ($json.webhookUrl.split('/').pop().match(/^agent_(\\d+)$/i) ? parseInt($json.webhookUrl.split('/').pop().replace(/^agent_/i, '')) : null) : null}}",
        "type": "number"
      },
      {
        "id": "...",
        "name": "tenantId",
        "value": "={{$json.webhookUrl ? parseInt($json.webhookUrl.split('/').pop().replace(/\\s+/g, '').replace(/^(tenant_|agent_)/i, '')) || null : null}}",
        "type": "number"
      }
    ]
  }
}
```

### 3. Atualizar Filtro

**Node:** `Filter` (linha ~344)

**Problema Atual:**
```json
{
  "leftValue": "={{ $('Webhook').item.json.webhookUrl }}",
  "rightValue": "=https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/{{ $json.evolutionInstanceName }}",
  "operator": "equals"
}
```

**Correção (Opção 1 - Comparar com evolutionInstanceName do agente):**
```json
{
  "leftValue": "={{ $('Webhook').item.json.webhookUrl }}",
  "rightValue": "=https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/{{ $('Select rows from a table').item.json.evolutionInstanceName }}",
  "operator": "equals"
}
```

**Correção (Opção 2 - Comparar path extraído):**
```json
{
  "leftValue": "={{ $('Edit Fields2').item.json.webhookPath }}",
  "rightValue": "={{ $('Select rows from a table').item.json.evolutionInstanceName }}",
  "operator": "equals"
}
```

**Correção (Opção 3 - Validar agentId se for formato agent_X):**
```json
{
  "conditions": [
    {
      "leftValue": "={{ $('Edit Fields2').item.json.agentId }}",
      "rightValue": "={{ $('Select rows from a table').item.json.id }}",
      "operator": "equals"
    }
  ],
  "combinator": "and"
}
```

## 🔧 Passo a Passo para Corrigir no N8N

### Passo 1: Atualizar "Edit Fields2"

1. Abra o node `Edit Fields2`
2. Adicione/Atualize os campos:

   **Campo `webhookPath` (extrair path completo):**
   - **Name:** `webhookPath`
   - **Value:** `={{$json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() }}`
   - **Type:** String
   - **Exemplo:** `tenant_52/agent_14`

   **Campo `tenantId` (extrair do path):**
   - **Name:** `tenantId`
   - **Value:** `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/')[0].replace(/^tenant_/i, '')) || null : null}}`
   - **Type:** Number

   **Campo `agentId` (extrair do path):**
   - **Name:** `agentId`
   - **Value:** `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/').pop().replace(/^agent_/i, '')) || null : null}}`
   - **Type:** Number

### Passo 2: Atualizar "Select rows from a table"

1. Abra o node `Select rows from a table`
2. **Mude a Table:** De `tenants` para `agents`
3. **Atualize o Where (RECOMENDADO - buscar por agentId):**
   - **Column:** `id`
   - **Value:** `={{ $json.agentId }}`
   
   **OU** (se quiser buscar por evolutionInstanceName):
   - **Column:** `evolutionInstanceName`
   - **Value:** `={{ $json.webhookPath.split('/').pop() }}` (pegar apenas a parte do agent)
   
   **OU** usar query SQL direta (mais robusta):
   ```sql
   SELECT * FROM agents 
   WHERE id = {{ $json.agentId }}
      AND "tenantId" = {{ $json.tenantId }}
   LIMIT 1;
   ```
   
   **IMPORTANTE:** Depois de buscar o agente, use o `agentId` para buscar a configuração:
   ```sql
   SELECT 
     ac."systemPrompt",
     ac."companyInfo",
     ac."welcomeMessage",
     ac."toolsConfig",
     ac."ragConfig"
   FROM "agentConfigs" ac
   WHERE ac."agentId" = {{ $('Select rows from a table').item.json.id }}
   LIMIT 1;
   ```
   
   **Nota:** O `evolutionInstanceName` no banco é `agent_${agentId}`, não o path completo do webhook.

### Passo 3: Atualizar "Filter"

1. Abra o node `Filter`
2. **Atualize a condição (validação dupla - mais segura):**
   
   **Opção 1 - Validar agentId:**
   ```json
   {
     "conditions": [
       {
         "leftValue": "={{ $('Edit Fields2').item.json.agentId }}",
         "rightValue": "={{ $('Select rows from a table').item.json.id }}",
         "operator": "equals"
       },
       {
         "leftValue": "={{ $('Edit Fields2').item.json.tenantId }}",
         "rightValue": "={{ $('Select rows from a table').item.json.tenantId }}",
         "operator": "equals"
       }
     ],
     "combinator": "and"
   }
   ```
   
   **Opção 2 - Validar evolutionInstanceName:**
   ```json
   {
     "conditions": [
       {
         "leftValue": "={{ $('Edit Fields2').item.json.webhookPath.split('/').pop() }}",
         "rightValue": "={{ $('Select rows from a table').item.json.evolutionInstanceName }}",
         "operator": "equals"
       }
     ],
     "combinator": "and"
   }
   ```
   
   **Recomendado:** Usar Opção 1 (validação dupla de agentId e tenantId) para máxima segurança.

## ✅ Resultado Esperado

Após a correção:
- ✅ Filtro funciona com `agent_${agentId}` (novo formato)
- ✅ Filtro funciona com `tenant_${tenantId}` (compatibilidade)
- ✅ Busca correta na tabela `agents`
- ✅ Bloqueia mensagens de outros agentes/tenants

## 🔍 Verificação

Para testar:
1. Envie uma mensagem para o agente correto → Deve passar pelo filtro
2. Tente enviar com webhook de outro agente → Deve ser bloqueado pelo filtro

## 📝 Nota Importante

O filtro é **crítico para segurança** - ele garante que apenas mensagens do agente correto sejam processadas. Sem ele, um agente poderia processar mensagens destinadas a outro agente.

