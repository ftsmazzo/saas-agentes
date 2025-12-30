# 🔒 Guia: Isolamento Multi-Tenant no N8N Workflow

## ⚠️ REGRA DE OURO

**TODAS as queries SQL no N8N DEVEM filtrar por `tenantId`!**

Sem o filtro `tenantId`, você pode vazar dados de outros clientes! 🔴

---

## 📋 Tabelas Disponíveis

### 1. `clientData` (substitui `dados_cliente`)
Armazena dados específicos de atendimento por cliente.

**Campos:**
- `id` - ID único
- `tenantId` - **SEMPRE filtrar por este campo!**
- `phone` - Telefone do cliente
- `name` - Nome do WhatsApp
- `aiService` - Tipo de atendimento da IA
- `createdAt`, `updatedAt` - Timestamps

### 2. `documents` (RAG - Vector Embeddings)
Documentos para busca semântica com embeddings.

**Campos:**
- `id` - ID único
- `tenantId` - **SEMPRE filtrar por este campo!**
- `content` - Conteúdo do documento
- `metadata` - JSONB com metadados
- `embedding` - Vector(1536) para embeddings OpenAI
- `createdAt`, `updatedAt` - Timestamps

### 3. `conversations` (compatível com `chats`)
Conversas entre cliente e agente.

**Campos:**
- `id` - ID único
- `tenantId` - **SEMPRE filtrar por este campo!**
- `contactId` - ID do contato
- `phone` - Telefone (compatibilidade)
- `etapaFollowup` - Etapa do follow-up
- `status` - Status da conversa
- `aiPaused` - Se IA está pausada
- `startedAt`, `lastMessageAt`, `closedAt` - Timestamps

### 4. `chatMessages` (compatível com `chat_messages`)
Mensagens individuais das conversas.

**Campos:**
- `id` - ID único
- `tenantId` - **SEMPRE filtrar por este campo!**
- `conversationId` - ID da conversa
- `contactId` - ID do contato
- `phone`, `nomewpp` - Dados do WhatsApp (compatibilidade)
- `botMessage`, `userMessage` - Mensagens (compatibilidade)
- `messageType` - Tipo de mensagem
- `active` - Se está ativa
- `role` - user/assistant/system
- `content` - Conteúdo da mensagem
- `createdAt` - Timestamp

---

## ✅ Exemplos CORRETOS (com tenantId)

### Inserir dados do cliente
```sql
INSERT INTO "clientData" ("tenantId", phone, name, "aiService")
VALUES ({{ $json.tenantId }}, '{{ $json.phone }}', '{{ $json.name }}', '{{ $json.aiService }}');
```

### Buscar conversas do tenant
```sql
SELECT * FROM conversations 
WHERE "tenantId" = {{ $json.tenantId }}
ORDER BY "startedAt" DESC
LIMIT 10;
```

### Buscar mensagens de uma conversa
```sql
SELECT * FROM "chatMessages"
WHERE "tenantId" = {{ $json.tenantId }}
  AND "conversationId" = {{ $json.conversationId }}
ORDER BY "createdAt" ASC;
```

### Buscar documentos similares (RAG)
```sql
SELECT * FROM match_documents(
  '{{ $json.queryEmbedding }}'::vector(1536),
  5, -- match_count
  '{}'::jsonb, -- filter
  {{ $json.tenantId }} -- tenant_id_filter (IMPORTANTE!)
);
```

### Inserir documento com embedding
```sql
INSERT INTO documents ("tenantId", content, metadata, embedding)
VALUES (
  {{ $json.tenantId }},
  '{{ $json.content }}',
  '{{ $json.metadata }}'::jsonb,
  '{{ $json.embedding }}'::vector(1536)
);
```

---

## ❌ Exemplos ERRADOS (sem tenantId)

### ❌ ERRADO: Sem filtro tenantId
```sql
-- PERIGO! Vaza dados de todos os tenants!
SELECT * FROM "clientData";
```

### ❌ ERRADO: Filtro incorreto
```sql
-- PERIGO! Pode retornar dados de outros tenants se phone não for único
SELECT * FROM "clientData" WHERE phone = '{{ $json.phone }}';
```

### ❌ ERRADO: Busca vetorial sem tenantId
```sql
-- PERIGO! Busca em documentos de todos os tenants!
SELECT * FROM match_documents(
  '{{ $json.queryEmbedding }}'::vector(1536),
  5
);
```

---

## 🔧 Como Obter tenantId no N8N

### Opção 1: Receber do Webhook
Se o webhook recebe `tenantId`:
```javascript
// No código do N8N
const tenantId = $json.body.tenantId;
```

### Opção 2: Extrair da URL do Webhook
Se a URL é `/webhook/tenant_10`:
```javascript
// No código do N8N
const webhookPath = $json.path;
const tenantId = webhookPath.split('_')[1]; // Extrai "10" de "tenant_10"
```

### Opção 3: Buscar pelo telefone (com cuidado!)
```sql
-- CUIDADO: Só funciona se phone for único por tenant
SELECT "tenantId" FROM "clientData" 
WHERE phone = '{{ $json.phone }}'
LIMIT 1;
```

---

## 📝 Checklist de Segurança

Antes de executar qualquer query SQL no N8N:

- [ ] ✅ Query inclui `WHERE "tenantId" = {{ $json.tenantId }}`?
- [ ] ✅ Funções como `match_documents()` recebem `tenant_id_filter`?
- [ ] ✅ INSERTs incluem `"tenantId"` no VALUES?
- [ ] ✅ UPDATEs incluem `"tenantId"` no WHERE?
- [ ] ✅ DELETEs incluem `"tenantId"` no WHERE?
- [ ] ✅ JOINs incluem filtro de `tenantId` em todas as tabelas?

---

## 🚀 Próximos Passos

1. ✅ Executar `SQL_INTEGRAR_TABELAS_TEMPLATE.sql` no PostgreSQL
2. ✅ Atualizar workflows N8N para usar `tenantId`
3. ✅ Testar isolamento entre tenants
4. ✅ Documentar queries específicas do seu workflow

---

## 📚 Referências

- [Arquitetura Multi-Tenant](./ARQUITETURA_MULTI_TENANT.md)
- [Script SQL de Migração](./SQL_INTEGRAR_TABELAS_TEMPLATE.sql)

