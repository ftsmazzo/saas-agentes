# Validação de Segurança no Webhook Handler

## 🔒 Proteções Implementadas

### 1. Validação de Agente na URL

Quando o webhook vem como `/webhook/agent_${agentId}`:
- ✅ Busca o agente no banco de dados
- ✅ Verifica se o agente existe
- ✅ Verifica se o agente está ativo (`isActive = true` e `status != 'deleted'`)
- ✅ Bloqueia webhook se agente estiver deletado ou inativo
- ✅ Obtém o `tenantId` do agente (não confia no payload)

### 2. Validação de agentId no Payload

Quando o payload contém um `agentId`:
- ✅ **Prioriza `agentId` da URL** (mais seguro, não pode ser falsificado)
- ✅ Se não tem `agentId` na URL, valida o `agentId` do payload:
  - Busca o agente no banco
  - Verifica se o agente pertence ao `tenantId` identificado na URL
  - **Bloqueia transação** se `agent.tenantId !== tenantId` (possível fraude)
  - Ignora `agentId` inválido (agente não encontrado)

### 3. Gravação no Banco de Dados

A tabela `usageTransactions` grava:
- ✅ `tenantId` (NOT NULL) - Obrigatório, sempre preenchido
- ✅ `agentId` (opcional) - Preenchido quando disponível e validado

**Exemplo de registro:**
```sql
INSERT INTO usageTransactions (
  tenantId,      -- 51 (sempre presente)
  agentId,       -- 123 (quando disponível e validado)
  operation,     -- 'chat'
  model,         -- 'gpt-4o-mini'
  tokensInput,   -- 100
  tokensOutput,  -- 50
  totalTokens,   -- 150
  costUSD,       -- 0.000015
  creditsUsed,   -- 2
  metadata       -- JSON com workflowId, executionId, etc
)
```

## 🛡️ Cenários de Segurança

### Cenário 1: Webhook com `agent_123` na URL
```
POST /api/webhooks/n8n/agent_123
Body: { agentId: 456, ... }
```

**Comportamento:**
- ✅ Identifica `agentId = 123` da URL
- ✅ Busca agente 123 no banco → `tenantId = 51`
- ✅ **Ignora `agentId: 456` do payload** (usa 123 da URL)
- ✅ Grava transação com `tenantId = 51, agentId = 123`

### Cenário 2: Webhook com `tenant_51` na URL (formato antigo)
```
POST /api/webhooks/n8n/tenant_51
Body: { agentId: 123, ... }
```

**Comportamento:**
- ✅ Identifica `tenantId = 51` da URL
- ✅ Busca `agentId = 123` do payload no banco
- ✅ Valida que `agent.tenantId === 51`
- ✅ Se válido: grava com `tenantId = 51, agentId = 123`
- ✅ Se inválido: **bloqueia transação** (erro de segurança)

### Cenário 3: Tentativa de Fraude
```
POST /api/webhooks/n8n/agent_123
Body: { agentId: 999, ... }  // Agente 999 pertence a outro tenant
```

**Comportamento:**
- ✅ Identifica `agentId = 123` da URL → `tenantId = 51`
- ✅ Ignora `agentId: 999` do payload (usa 123 da URL)
- ✅ Grava transação com `tenantId = 51, agentId = 123`
- ✅ **Fraude bloqueada** - não consegue usar agente de outro tenant

### Cenário 4: Agente Deletado/Inativo
```
POST /api/webhooks/n8n/agent_123
```

**Comportamento:**
- ✅ Busca agente 123 no banco
- ✅ Verifica `agent.status === 'deleted'` ou `agent.isActive === false`
- ✅ **Retorna HTTP 403** (Forbidden)
- ✅ **Bloqueia webhook completamente**

## 📊 Logs de Segurança

O sistema registra:
- ✅ Tentativas de uso de `agentId` inválido
- ✅ Tentativas de uso de agente de outro tenant
- ✅ Tentativas de uso de agente deletado/inativo
- ✅ Todos os logs incluem `tenantId` e `agentId` para auditoria

**Exemplo de log de segurança:**
```
[N8N Webhook] 🚨 SEGURANÇA: Agente 999 não pertence ao tenant 51! Bloqueando transação.
[N8N Webhook] 🚨 SEGURANÇA: Agente 123 está deletado ou inativo! Bloqueando webhook.
```

## ✅ Resumo

1. **`tenantId` sempre gravado** - Obrigatório na tabela
2. **`agentId` gravado quando disponível** - Opcional, mas validado
3. **Validação dupla** - URL + Payload (prioriza URL)
4. **Bloqueio de fraude** - Não permite usar agente de outro tenant
5. **Bloqueio de inativos** - Não processa webhooks de agentes deletados/inativos

## 🔍 Como Verificar

### Verificar Transações no Banco:
```sql
SELECT 
  id,
  "tenantId",
  "agentId",
  operation,
  "creditsUsed",
  created_at
FROM "usageTransactions"
WHERE "tenantId" = 51
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar Logs de Segurança:
```bash
grep "SEGURANÇA" logs.txt
grep "Bloqueando" logs.txt
```

## 📚 Referências

- `server/webhooks/n8n.ts` - Handler principal com validações
- `server/credit-system.ts` - Função `recordUsageTransaction`
- `drizzle/schema.ts` - Schema da tabela `usageTransactions`

