# ✅ Resumo da Migração: Limpeza Manus + PostgreSQL

## 🎉 O QUE FOI CONCLUÍDO

### ✅ Limpeza de Referências Manus

1. **vite.config.ts**
   - ✅ Removido `vite-plugin-manus-runtime`
   - ✅ Removidos domínios manus (`.manus.computer`, etc.)
   - ✅ Mantidos apenas `localhost` e `127.0.0.1`

2. **Componentes**
   - ✅ Deletado `client/src/components/ManusDialog.tsx`

3. **Backend**
   - ✅ Removido `registerOAuthRoutes` do `server/_core/index.ts`
   - ✅ Removido fallback OAuth do `server/_core/context.ts`
   - ✅ Limpado `server/_core/env.ts` (removidas variáveis Manus)
   - ✅ Removida lógica `ownerOpenId` do `server/db.ts`

### ✅ Migração para PostgreSQL

1. **Schema (drizzle/schema.ts)**
   - ✅ Convertido de MySQL para PostgreSQL
   - ✅ `mysqlTable` → `pgTable`
   - ✅ `mysqlEnum` → `pgEnum`
   - ✅ `int().autoincrement()` → `serial()`
   - ✅ `timestamp()` → `timestamptz()`
   - ✅ Criados todos os enums necessários

2. **Conexão (server/db.ts)**
   - ✅ `drizzle-orm/mysql2` → `drizzle-orm/postgres-js`
   - ✅ `mysql2/promise` → `postgres`
   - ✅ Atualizadas operações de insert para usar `.returning()`
   - ✅ `onDuplicateKeyUpdate` → `onConflictDoUpdate`

3. **Configuração (drizzle.config.ts)**
   - ✅ `dialect: "mysql"` → `dialect: "postgresql"`

---

## 📋 PRÓXIMOS PASSOS (VOCÊ PRECISA FAZER)

### 1. Atualizar Dependências

```bash
# Remover MySQL
pnpm remove mysql2

# Adicionar PostgreSQL (verificar se já tem)
pnpm add postgres
```

**Nota**: Você já tem `pg` e `@types/pg` no package.json, mas precisa de `postgres` (biblioteca diferente, mais moderna).

### 2. Atualizar Variável de Ambiente

No EasyPanel ou `.env`, atualize `DATABASE_URL`:

```env
# Formato PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Gerar Migrações

```bash
pnpm db:push
```

Isso vai:
- Gerar novas migrações SQL no diretório `drizzle/`
- Aplicar as migrações no banco PostgreSQL

### 4. Criar Tabelas do Workflow N8N

Execute este SQL no seu PostgreSQL (Supabase):

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

### 5. Migrar Dados (Se necessário)

Se você tem dados no MySQL que precisam ser migrados, crie um script de migração.

### 6. Testar

Após migração, testar:
- [ ] Login de admin
- [ ] Login de cliente  
- [ ] Criação de tenant
- [ ] Todas as operações CRUD

---

## ⚠️ IMPORTANTE

### Problemas Conhecidos

1. **Enums**: Os enums do PostgreSQL precisam ser criados antes das tabelas. O Drizzle deve fazer isso automaticamente, mas verifique os logs.

2. **updatedAt**: No PostgreSQL, `onUpdateNow()` pode não funcionar automaticamente. Se necessário, criar trigger:
   ```sql
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
   END;
   $$ language 'plpgsql';
   ```

3. **Migração de Dados**: Se você tem dados no MySQL, precisa criar script de migração antes de desligar o MySQL.

---

## 📝 Arquivos Modificados

- ✅ `vite.config.ts` - Removido plugin e domínios Manus
- ✅ `drizzle/schema.ts` - Migrado para PostgreSQL
- ✅ `server/db.ts` - Atualizado para PostgreSQL
- ✅ `drizzle.config.ts` - Dialect PostgreSQL
- ✅ `server/_core/index.ts` - Removido OAuth
- ✅ `server/_core/context.ts` - Removido fallback OAuth
- ✅ `server/_core/env.ts` - Limpado variáveis Manus
- ✅ `client/src/components/ManusDialog.tsx` - DELETADO

---

## 🚀 Próximo Passo

**Execute os comandos acima e me avise quando estiver pronto!**

Depois podemos:
1. Ajustar o workflow N8N para usar PostgreSQL unificado
2. Adicionar suporte a áudio com ElevenLabs
3. Tornar o workflow configurável

