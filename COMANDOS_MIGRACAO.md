# 🚀 Comandos para Executar a Migração

## 1. Atualizar Dependências

```bash
# Remover MySQL
pnpm remove mysql2

# Adicionar PostgreSQL (biblioteca moderna)
pnpm add postgres
```

**Nota**: Você já tem `pg` e `@types/pg`, mas precisa de `postgres` também (biblioteca diferente, mais moderna e recomendada pelo Drizzle).

## 2. Atualizar DATABASE_URL

No EasyPanel ou arquivo `.env`, atualize:

```env
# Formato PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/postgres
```

**Exemplo Supabase:**
```env
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

## 3. Gerar e Aplicar Migrações

```bash
# Gerar migrações do novo schema PostgreSQL
pnpm db:push
```

Isso vai:
- Criar arquivos SQL de migração em `drizzle/`
- Aplicar as migrações no banco PostgreSQL

## 4. Criar Tabelas do Workflow N8N

Execute este SQL no seu PostgreSQL (via Supabase Dashboard ou psql):

```sql
-- Tabelas do workflow N8N (com tenant_id para multi-tenant)
CREATE TABLE IF NOT EXISTS chats (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  etapa_followup NUMERIC
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone TEXT NOT NULL,
  nomewpp TEXT,
  bot_message TEXT,
  user_message TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dados_cliente (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  telefone TEXT NOT NULL,
  nomewpp TEXT,
  atendimento_ia TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chats_tenant_phone ON chats(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_phone ON chat_messages(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_dados_cliente_tenant_telefone ON dados_cliente(tenant_id, telefone);
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_tenant_session ON n8n_chat_histories(tenant_id, session_id);
```

## 5. Testar Conexão

```bash
# Rodar servidor em desenvolvimento
pnpm dev
```

Verificar se:
- ✅ Servidor inicia sem erros
- ✅ Conexão com PostgreSQL funciona
- ✅ Login de admin funciona
- ✅ Login de cliente funciona

## 6. Remover Package Manus (Opcional)

```bash
# Se quiser remover completamente
pnpm remove vite-plugin-manus-runtime
```

---

## ⚠️ Se Der Erro

### Erro: "Cannot find module 'postgres'"
```bash
pnpm add postgres
```

### Erro: "relation does not exist"
- Execute `pnpm db:push` novamente
- Verifique se `DATABASE_URL` está correto

### Erro: "enum does not exist"
- Os enums são criados automaticamente pelo Drizzle
- Se der erro, pode precisar criar manualmente ou verificar logs

---

## ✅ Checklist Final

- [ ] `pnpm remove mysql2` executado
- [ ] `pnpm add postgres` executado
- [ ] `DATABASE_URL` atualizado para PostgreSQL
- [ ] `pnpm db:push` executado com sucesso
- [ ] Tabelas do workflow N8N criadas
- [ ] Servidor inicia sem erros
- [ ] Login funciona
- [ ] Todas as operações CRUD funcionam

---

**Após executar esses comandos, me avise e continuamos com as próximas etapas!** 🚀

