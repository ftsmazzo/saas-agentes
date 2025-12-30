# 🔄 Guia Node a Node: Atualizar Workflow N8N para PostgreSQL Multi-Tenant

## 📋 Pré-requisitos

✅ Você já tem:
- `tenantId` extraído e funcionando no nó "Edit Fields2"
- Conexão PostgreSQL no início que busca da tabela `tenants`
- Credenciais PostgreSQL configuradas

---

## 🎯 Objetivo

Substituir todos os nodes **Supabase** e **Chat Memory** por nodes **PostgreSQL** com isolamento multi-tenant (`tenantId`).

---

## 📊 Nodes a Atualizar

### Nodes Supabase (8 nodes):
1. **Busca Telefone** - Busca em `chats`
2. **Adiciona CHAT supabase** - Insere em `chats`
3. **Atualiza CHAT Supabase** - Atualiza `chats`
4. **Cria Histórico Supabase** - Insere em `chat_messages`
5. **Pausar IA** - Atualiza `dados_cliente`
6. **Reativar IA** - Atualiza `dados_cliente`
7. **Buscar Cliente** - Busca em `dados_cliente`
8. **Criar Cliente** - Insere em `dados_cliente`

### Nodes Chat Memory (1 node):
1. **Postgres Chat Memory** - Memory para LangChain

### Nodes PostgreSQL (2 nodes):
1. **Salvar Historico1** - Insere em `n8n_chat_histories` (já é PostgreSQL, mas precisa adicionar tenantId)

---

## 🔧 NODE 1: Busca Telefone

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `get`
- **Tabela:** `chats`
- **Filtro:** `phone = {{ $('Info2').item.json.telefone }}`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
SELECT * FROM conversations 
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND phone = '{{ $('Info2').item.json.telefone }}'
LIMIT 1;
```

### 📝 Passos:
1. Delete o node Supabase "Busca Telefone"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL que você já tem
4. Renomeie para: `Busca Telefone`

---

## 🔧 NODE 2: Adiciona CHAT supabase

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `insert`
- **Tabela:** `chats`
- **Campos:** `phone`, `updated_at`, `created_at`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
INSERT INTO conversations ("tenantId", phone, "updatedAt", "startedAt")
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  '{{ $('Info2').item.json.telefone }}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING *;
```

### 📝 Passos:
1. Delete o node Supabase "Adiciona CHAT supabase"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Adiciona CHAT`

---

## 🔧 NODE 3: Atualiza CHAT Supabase

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `update`
- **Tabela:** `chats`
- **Filtro:** `phone = {{ $('Info2').item.json.telefone }}`
- **Campos:** `updated_at`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
UPDATE conversations 
SET "lastMessageAt" = NOW(),
    "updatedAt" = NOW()::text
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND phone = '{{ $('Info2').item.json.telefone }}'
RETURNING *;
```

### 📝 Passos:
1. Delete o node Supabase "Atualiza CHAT Supabase"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Atualiza CHAT`

---

## 🔧 NODE 4: Cria Histórico Supabase

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `insert`
- **Tabela:** `chat_messages`
- **Campos:** `phone`, `bot_message`, `user_message`, `message_type`, `created_at`, `nomewpp`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
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
  {{ $('Edit Fields2').item.json.tenantId }},
  (SELECT id FROM conversations 
   WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
     AND phone = '{{ $('Info2').item.json.telefone }}'
   LIMIT 1),
  (SELECT id FROM contacts 
   WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
     AND "phoneNumber" = '{{ $('Info2').item.json.telefone }}'
   LIMIT 1),
  '{{ $('Info2').item.json.telefone }}',
  '{{ $('Info2').item.json.NomeWhatsapp }}',
  '{{ $('Supervisor').first().json.output }}',
  '{{ $('Info2').item.json.mensagem }}',
  '{{ $('Info2').item.json.tipo }}',
  'assistant',
  '{{ $('Supervisor').first().json.output }}',
  true
)
RETURNING *;
```

### 📝 Passos:
1. Delete o node Supabase "Cria Histórico Supabase"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Cria Histórico`

---

## 🔧 NODE 5: Pausar IA

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `update`
- **Tabela:** `dados_cliente`
- **Filtro:** `telefone = {{ $('Info2').item.json.telefone }}`
- **Campos:** `atendimento_ia = 'pause'`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
UPDATE "clientData"
SET "aiService" = 'pause',
    "updatedAt" = NOW()
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND phone = '{{ $('Info2').item.json.telefone }}'
RETURNING *;
```

### 📝 Passos:
1. Delete o node Supabase "Pausar IA"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Pausar IA`

---

## 🔧 NODE 6: Reativar IA

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `update`
- **Tabela:** `dados_cliente`
- **Filtro:** `telefone = {{ $('Info2').item.json.telefone }}`
- **Campos:** `atendimento_ia = 'active'` (ou similar)

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
UPDATE "clientData"
SET "aiService" = 'active',
    "updatedAt" = NOW()
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND phone = '{{ $('Info2').item.json.telefone }}'
RETURNING *;
```

### 📝 Passos:
1. Delete o node Supabase "Reativar IA"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Reativar IA`

---

## 🔧 NODE 7: Buscar Cliente

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `get`
- **Tabela:** `dados_cliente`
- **Filtro:** `telefone = {{ $('Info2').item.json.telefone }}`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
SELECT * FROM "clientData"
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND phone = '{{ $('Info2').item.json.telefone }}'
LIMIT 1;
```

### 📝 Passos:
1. Delete o node Supabase "Buscar Cliente"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Buscar Cliente`

---

## 🔧 NODE 8: Criar Cliente

### ❌ ANTES (Supabase)
- **Tipo:** `n8n-nodes-base.supabase`
- **Operação:** `insert`
- **Tabela:** `dados_cliente`
- **Campos:** `nomewpp`, `telefone`, `created_at`

### ✅ DEPOIS (PostgreSQL)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
INSERT INTO "clientData" ("tenantId", phone, name, "aiService", "createdAt", "updatedAt")
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  '{{ $('Info2').item.json.telefone }}',
  '{{ $('Info2').item.json.NomeWhatsapp }}',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING *;
```

### 📝 Passos:
1. Delete o node Supabase "Criar Cliente"
2. Adicione um novo node **PostgreSQL**
3. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole a query acima
   - **Credentials:** Use a mesma credencial PostgreSQL
4. Renomeie para: `Criar Cliente`

---

## 🔧 NODE 9: Salvar Historico Cliente

### ⚠️ ATENÇÃO: Este node JÁ é PostgreSQL!

Este node já usa PostgreSQL para inserir em `n8n_chat_histories`, mas precisa incluir `tenantId` no `session_id`.

### ❌ ANTES (PostgreSQL sem tenantId)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Insert`
- **Tabela:** `n8n_chat_histories`
- **Session ID:** `={{ $('Info2').item.json.telefone }}`
- **Message:** JSON com mensagem do usuário

### ✅ DEPOIS (PostgreSQL com tenantId)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Insert` (pode manter ou mudar para Execute Query)
- **Tabela:** `n8n_chat_histories`
- **Session ID:** `={{ $('Edit Fields2').item.json.tenantId }}_${ $('Info2').item.json.telefone }}`
- **Message:** Mantém o mesmo formato

### 📝 Passos:
1. Abra o node "Salvar Historico Cliente"
2. Na seção **Columns**, encontre o campo `session_id`
3. Altere o valor de:
   ```
   ={{ $('Info2').item.json.telefone }}
   ```
   Para:
   ```
   ={{ $('Edit Fields2').item.json.tenantId }}_${ $('Info2').item.json.telefone }}
   ```
4. Isso garante que cada tenant tenha seu próprio histórico isolado
5. O campo `message` pode permanecer igual

---

## 🔧 NODE 10: Postgres Chat Memory

### ❌ ANTES (Memory Node)
- **Tipo:** `@n8n/n8n-nodes-langchain.memoryPostgresChat`
- **Session Key:** `={{ $('Info2').item.json.telefone }}`
- **Tabela:** `n8n_chat_histories` (gerenciada pelo LangChain)

### ✅ DEPOIS (PostgreSQL Manual)
**Opção 1: Manter Memory Node mas com tenantId**

O Memory Node do LangChain não suporta filtro por tenantId diretamente. Você tem duas opções:

**Opção A: Usar session_id único por tenant**
- **Session Key:** `={{ $('Edit Fields2').item.json.tenantId }}_${ $('Info2').item.json.telefone }}`
- Isso cria sessões isoladas por tenant

**Opção B: Substituir por queries manuais**

Criar nodes PostgreSQL para gerenciar histórico manualmente (mais complexo, mas mais controle).

### 📝 Passos (Opção A - Recomendada):
1. Abra o node "Postgres Chat Memory"
2. Altere o **Session Key** para:
```
={{ $('Edit Fields2').item.json.tenantId }}_${ $('Info2').item.json.telefone }}
```
3. Isso garante que cada tenant tenha seu próprio histórico isolado

---

## 🔧 NODE 11: Salvar Historico1

### ❌ ANTES (PostgreSQL sem tenantId)
- **Tipo:** `n8n-nodes-base.postgres`
- **Tabela:** `n8n_chat_histories`
- **Session ID:** `={{ $('Info2').item.json.telefone }}`

### ✅ DEPOIS (PostgreSQL com tenantId)
- **Tipo:** `n8n-nodes-base.postgres`
- **Operação:** `Execute Query`
- **Query:**
```sql
INSERT INTO n8n_chat_histories (session_id, message)
VALUES (
  '{{ $('Edit Fields2').item.json.tenantId }}_${ $('Info2').item.json.telefone }}',
  '{"type": "ai", "content": "{{ $('Info2').item.json.mensagem.replace(/\r?\n|\r/g, ' ') }}", "additional_kwargs": {}, "response_metadata": {}}'::jsonb
)
ON CONFLICT DO NOTHING;
```

### 📝 Passos:
1. Abra o node "Salvar Historico1"
2. Mude de **Insert** para **Execute Query**
3. Cole a query acima
4. Isso adiciona `tenantId` ao `session_id` para isolamento

---

## ✅ Checklist Final

Após atualizar todos os nodes:

- [ ] Todos os nodes Supabase foram substituídos por PostgreSQL
- [ ] Todas as queries incluem `WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}`
- [ ] Todos os INSERTs incluem `"tenantId"` no VALUES
- [ ] Memory Node usa session_id com tenantId
- [ ] Teste com diferentes tenants para verificar isolamento

---

## 🚨 Importante

1. **Sempre use `$('Edit Fields2')`** para pegar o `tenantId` (ou o nome do seu node que extrai tenantId)
2. **Sempre filtre por tenantId** em todas as queries
3. **Use aspas duplas** nos nomes de tabelas e colunas: `"chatMessages"`, `"tenantId"`
4. **Teste cada node** individualmente antes de continuar

---

## 📚 Próximos Passos

Após atualizar todos os nodes:
1. Teste o workflow completo
2. Verifique isolamento entre tenants
3. Ajuste queries conforme necessário

