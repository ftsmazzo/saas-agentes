# 🔄 Guia: Atualizar Workflow N8N para Multi-Tenant

## 📋 Situação Atual

✅ **Tabelas criadas no PostgreSQL:**
- `clientData` (substitui `dados_cliente`)
- `documents` (RAG com vector embeddings)
- `conversations` (com campos adicionais)
- `chatMessages` (com campos adicionais)

✅ **Webhook do N8N:** `/webhook/tenant_10` (onde `10` é o `tenantId`)

---

## 🎯 Objetivo

Atualizar o workflow do N8N para:
1. ✅ Extrair `tenantId` do webhook
2. ✅ Usar as novas tabelas PostgreSQL
3. ✅ Sempre filtrar por `tenantId` em todas as queries
4. ✅ Usar função `match_documents()` para RAG (se aplicável)

---

## 🔧 Passo 1: Extrair tenantId do Webhook

### Opção A: Usar Nó Set (Recomendado - Mais Simples)

Se você já tem um campo que extrai o webhook URL, adicione um segundo campo:

**Campo 1 (já existe):**
- **Name:** `webhookPath` (ou o nome que você já usa)
- **Value:** `{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '') }}`

**Campo 2 (novo - para extrair apenas o ID):**
- **Name:** `tenantId`
- **Value:** `{{parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop())}}`
- **Type:** Number

**Explicação:**
- Pega a última parte da URL (ex: `tenant_10`)
- Divide por `_` e pega a última parte (ex: `10`)
- Converte para número

### Opção B: Extrair da URL do Webhook (Alternativa)

No primeiro nó do workflow (geralmente o Webhook), adicione um nó **Code**:

```javascript
// No nó Code (JavaScript)
// O webhook path vem como: /webhook/tenant_10
const webhookPath = $json.path || $json.headers['x-path'] || '';
const tenantId = webhookPath.split('_')[1] || webhookPath.split('/').pop();

return {
  json: {
    ...$json,
    tenantId: parseInt(tenantId) || null
  }
};
```

### Opção C: Usar Expressão do N8N (Se tiver path direto)

No nó **Set**, adicione um campo:
- **Name:** `tenantId`
- **Value:** `{{ parseInt($json.path.split('_')[1]) }}`

---

## 🔧 Passo 2: Atualizar Queries SQL

### ❌ ANTES (Template Original - Sem tenantId)

```sql
-- PERIGO: Vaza dados de todos os tenants!
SELECT * FROM chat_messages WHERE phone = '{{ $json.phone }}';
```

### ✅ DEPOIS (Multi-Tenant - Com tenantId)

```sql
-- CORRETO: Filtra por tenantId
SELECT * FROM "chatMessages" 
WHERE "tenantId" = {{ $json.tenantId }}
  AND phone = '{{ $json.phone }}';
```

---

## 📊 Exemplos Práticos de Queries

### 1. Inserir Dados do Cliente (`clientData`)

```sql
INSERT INTO "clientData" ("tenantId", phone, name, "aiService")
VALUES (
  {{ $json.tenantId }},
  '{{ $json.phone }}',
  '{{ $json.name }}',
  '{{ $json.aiService }}'
)
ON CONFLICT (phone, "tenantId") 
DO UPDATE SET 
  name = EXCLUDED.name,
  "aiService" = EXCLUDED."aiService",
  "updatedAt" = NOW();
```

### 2. Buscar Conversas do Tenant

```sql
SELECT 
  c.id,
  c."contactId",
  c.phone,
  c.status,
  c."etapaFollowup",
  c."startedAt",
  c."lastMessageAt"
FROM conversations c
WHERE c."tenantId" = {{ $json.tenantId }}
  AND c.status = 'active'
ORDER BY c."lastMessageAt" DESC
LIMIT 10;
```

### 3. Inserir Mensagem (`chatMessages`)

```sql
INSERT INTO "chatMessages" (
  "tenantId",
  "conversationId",
  "contactId",
  phone,
  nomewpp,
  "botMessage",
  "userMessage",
  "messageType",
  role,
  content,
  active
)
VALUES (
  {{ $json.tenantId }},
  {{ $json.conversationId }},
  {{ $json.contactId }},
  '{{ $json.phone }}',
  '{{ $json.nomewpp }}',
  '{{ $json.botMessage }}',
  '{{ $json.userMessage }}',
  '{{ $json.messageType }}',
  '{{ $json.role }}',
  '{{ $json.content }}',
  true
);
```

### 4. Buscar Mensagens de uma Conversa

```sql
SELECT 
  id,
  phone,
  nomewpp,
  "botMessage",
  "userMessage",
  "messageType",
  role,
  content,
  "createdAt"
FROM "chatMessages"
WHERE "tenantId" = {{ $json.tenantId }}
  AND "conversationId" = {{ $json.conversationId }}
ORDER BY "createdAt" ASC;
```

### 5. Buscar Dados do Cliente (`clientData`)

```sql
SELECT 
  id,
  phone,
  name,
  "aiService",
  "createdAt",
  "updatedAt"
FROM "clientData"
WHERE "tenantId" = {{ $json.tenantId }}
  AND phone = '{{ $json.phone }}'
LIMIT 1;
```

---

## 🔍 Passo 3: Usar RAG com `match_documents()` (Opcional)

Se você está usando busca vetorial (RAG):

### Inserir Documento com Embedding

```sql
INSERT INTO documents ("tenantId", content, metadata, embedding)
VALUES (
  {{ $json.tenantId }},
  '{{ $json.content }}',
  '{{ $json.metadata }}'::jsonb,
  '{{ $json.embedding }}'::vector(1536)
);
```

### Buscar Documentos Similares

```sql
SELECT * FROM match_documents(
  '{{ $json.queryEmbedding }}'::vector(1536),
  5, -- match_count (quantos documentos retornar)
  '{}'::jsonb, -- filter (filtro por metadata, ex: '{"type": "faq"}'::jsonb)
  {{ $json.tenantId }} -- tenant_id_filter (IMPORTANTE!)
);
```

**Exemplo completo no N8N:**

1. **Nó 1:** Receber query do usuário
2. **Nó 2:** Gerar embedding da query (OpenAI Embeddings)
3. **Nó 3:** Buscar documentos similares:
   ```sql
   SELECT * FROM match_documents(
     '{{ $json.embedding }}'::vector(1536),
     3,
     '{"type": "faq"}'::jsonb,
     {{ $json.tenantId }}
   );
   ```
4. **Nó 4:** Usar documentos no prompt do LLM

---

## 🔧 Passo 4: Atualizar Nó PostgreSQL

### Configuração do Nó PostgreSQL

1. **Tipo de Conexão:** PostgreSQL
2. **Host:** `{{ $env.POSTGRES_HOST }}` ou valor fixo
3. **Database:** `{{ $env.POSTGRES_DB }}`
4. **User:** `{{ $env.POSTGRES_USER }}`
5. **Password:** `{{ $env.POSTGRES_PASSWORD }}`

### Operação: Execute Query

```sql
-- Sempre inclua tenantId na query!
SELECT * FROM "clientData" 
WHERE "tenantId" = {{ $json.tenantId }};
```

---

## ✅ Checklist de Atualização

Antes de publicar o workflow, verifique:

- [ ] ✅ `tenantId` é extraído do webhook
- [ ] ✅ Todas as queries SELECT incluem `WHERE "tenantId" = {{ $json.tenantId }}`
- [ ] ✅ Todas as queries INSERT incluem `"tenantId"` no VALUES
- [ ] ✅ Todas as queries UPDATE incluem `WHERE "tenantId" = {{ $json.tenantId }}`
- [ ] ✅ Todas as queries DELETE incluem `WHERE "tenantId" = {{ $json.tenantId }}`
- [ ] ✅ Função `match_documents()` recebe `tenant_id_filter`
- [ ] ✅ Nomes de tabelas usam aspas duplas: `"chatMessages"` (não `chat_messages`)
- [ ] ✅ Nomes de colunas usam camelCase com aspas: `"tenantId"` (não `tenant_id`)

---

## 🚨 Erros Comuns

### Erro 1: "column tenantId does not exist"
**Causa:** Usou `tenant_id` ao invés de `"tenantId"`  
**Solução:** Use `"tenantId"` com aspas duplas

### Erro 2: "relation chat_messages does not exist"
**Causa:** Usou nome antigo da tabela  
**Solução:** Use `"chatMessages"` (com aspas e camelCase)

### Erro 3: Dados de outros tenants aparecem
**Causa:** Esqueceu de filtrar por `tenantId`  
**Solução:** Sempre adicione `WHERE "tenantId" = {{ $json.tenantId }}`

---

## 📝 Exemplo Completo: Workflow de Mensagem

```
1. Webhook → Recebe mensagem do Chatwoot
2. Code → Extrai tenantId da URL
3. PostgreSQL → Busca dados do cliente:
   SELECT * FROM "clientData" 
   WHERE "tenantId" = {{ $json.tenantId }} 
     AND phone = '{{ $json.phone }}';
4. PostgreSQL → Insere mensagem:
   INSERT INTO "chatMessages" ("tenantId", ...) 
   VALUES ({{ $json.tenantId }}, ...);
5. LLM → Processa mensagem
6. PostgreSQL → Insere resposta:
   INSERT INTO "chatMessages" ("tenantId", ...) 
   VALUES ({{ $json.tenantId }}, ...);
7. HTTP Request → Envia resposta para Chatwoot
```

---

## 🎯 Próximos Passos

1. ✅ Abra o workflow template no N8N
2. ✅ Adicione nó para extrair `tenantId`
3. ✅ Atualize todas as queries SQL
4. ✅ Teste com diferentes tenants
5. ✅ Verifique isolamento de dados

---

## 📚 Referências

- `GUIA_N8N_TENANT_ISOLATION.md` - Guia detalhado de isolamento
- `ARQUITETURA_MULTI_TENANT.md` - Explicação da arquitetura
- `SQL_INTEGRAR_TABELAS_TEMPLATE.sql` - Estrutura das tabelas

