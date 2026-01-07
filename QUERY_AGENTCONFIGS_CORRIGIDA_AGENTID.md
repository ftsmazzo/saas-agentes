# ✅ Query agentConfigs Corrigida - Filtrar por agentId

## ❌ Problema

A query atual está sempre retornando o primeiro agente do tenant:

```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
LIMIT 1;
```

**Problema:** Filtra apenas por `tenantId` e usa `LIMIT 1`, então sempre pega o primeiro agente criado.

## ✅ Solução: Filtrar por agentId

### Opção 1: Filtrar por agentId (RECOMENDADO - se agentId estiver disponível)

```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND a.id = {{ $('Edit Fields2').item.json.agentId }}
LIMIT 1;
```

**OU** (se agentId pode ser null, usar condição):

```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND ({{ $('Edit Fields2').item.json.agentId }} IS NULL 
       OR a.id = {{ $('Edit Fields2').item.json.agentId }})
ORDER BY 
  CASE WHEN a.id = {{ $('Edit Fields2').item.json.agentId }} THEN 0 ELSE 1 END,
  a."createdAt" DESC
LIMIT 1;
```

### Opção 2: Filtrar diretamente por agentId (MAIS SIMPLES E EFICIENTE)

Se você já tem o `agentId` extraído do webhook, use diretamente:

```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
WHERE ac."agentId" = {{ $('Edit Fields2').item.json.agentId }}
LIMIT 1;
```

**Vantagens:**
- ✅ Mais simples (sem JOIN)
- ✅ Mais rápido (índice direto em `agentId`)
- ✅ Sempre retorna o agente correto

### Opção 3: Filtrar por evolutionInstanceName (se agentId não estiver disponível)

Se o `agentId` não estiver disponível, mas você tem o `evolutionInstanceName` do webhook:

```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND a."evolutionInstanceName" = {{ $('Edit Fields2').item.json.webhookPath.split('/').pop() }}
LIMIT 1;
```

**Nota:** O `evolutionInstanceName` no banco é `agent_${agentId}`, então você precisa extrair apenas a parte do agent do webhook path.

## 🎯 Recomendação Final

**Use a Opção 2** (filtrar diretamente por `agentId`) se o `agentId` estiver disponível no `Edit Fields2`:

```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
WHERE ac."agentId" = {{ $('Edit Fields2').item.json.agentId }}
LIMIT 1;
```

**Garanta que o campo `agentId` esteja sendo extraído no node `Edit Fields2`:**

- **Name:** `agentId`
- **Value:** `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/').pop().replace(/^agent_/i, '')) || null : null}}`
- **Type:** Number

## 🔍 Verificação

Após atualizar a query, verifique:

1. **No node `Edit Fields2`:** Confirme que o campo `agentId` está sendo extraído corretamente
2. **Na query:** Confirme que está usando `{{ $('Edit Fields2').item.json.agentId }}`
3. **Teste:** Envie uma mensagem para diferentes agentes e verifique se cada um usa sua própria configuração

## 📝 Exemplo Completo

**Node "Edit Fields2" (antes da query):**
- `webhookPath`: `={{$json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() }}`
- `tenantId`: `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/')[0].replace(/^tenant_/i, '')) || null : null}}`
- `agentId`: `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/').pop().replace(/^agent_/i, '')) || null : null}}`

**Query "Select rows from a table" (buscar agentConfigs):**
```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
WHERE ac."agentId" = {{ $('Edit Fields2').item.json.agentId }}
LIMIT 1;
```

