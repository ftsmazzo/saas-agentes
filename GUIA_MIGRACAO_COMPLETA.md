# 🚀 Guia Completo de Migração: Limpeza Manus + PostgreSQL

## ✅ O QUE JÁ FOI FEITO

### 1. Limpeza de Referências Manus ✅
- ✅ Removido `vite-plugin-manus-runtime` do `vite.config.ts`
- ✅ Removidos domínios manus do `vite.config.ts`
- ✅ Deletado `ManusDialog.tsx`
- ✅ Removido OAuth do Manus (`registerOAuthRoutes`)
- ✅ Removido fallback OAuth do `context.ts`
- ✅ Limpado `env.ts` (removidas variáveis Manus)
- ✅ Removida lógica `ownerOpenId` do `db.ts`

### 2. Migração Schema para PostgreSQL ✅
- ✅ Convertido `drizzle/schema.ts` de MySQL para PostgreSQL
- ✅ Todos os `mysqlTable` → `pgTable`
- ✅ Todos os `mysqlEnum` → `pgEnum`
- ✅ Todos os `int().autoincrement()` → `serial()`
- ✅ Todos os `timestamp()` → `timestamptz()`
- ✅ Atualizado `drizzle.config.ts` para `postgresql`
- ✅ Atualizado `server/db.ts` para usar `postgres-js`
- ✅ Atualizadas operações de insert para usar `.returning()`
- ✅ Atualizado `onDuplicateKeyUpdate` → `onConflictDoUpdate`

---

## 📋 PRÓXIMOS PASSOS

### 1. Atualizar Dependências

```bash
# Remover MySQL
pnpm remove mysql2

# Adicionar PostgreSQL (se ainda não tiver)
pnpm add postgres
pnpm add -D @types/pg
```

### 2. Atualizar Variável de Ambiente

A `DATABASE_URL` deve estar no formato PostgreSQL:

```env
# ANTES (MySQL)
DATABASE_URL=mysql://user:password@host:port/database

# DEPOIS (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Gerar Migrações

```bash
# Gerar migrações do novo schema
pnpm db:push
```

Isso vai criar novas migrações no diretório `drizzle/`.

### 4. Migrar Dados (Se houver dados no MySQL)

Criar script de migração para copiar dados do MySQL para PostgreSQL.

### 5. Criar Tabelas do Workflow N8N

Criar tabelas do workflow no PostgreSQL com `tenant_id`:

```sql
-- Tabelas do workflow N8N (com tenant_id)
CREATE TABLE chats (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  etapa_followup NUMERIC
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone TEXT NOT NULL,
  nomewpp TEXT,
  bot_message TEXT,
  user_message TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dados_cliente (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  telefone TEXT NOT NULL,
  nomewpp TEXT,
  atendimento_ia TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_chats_tenant_phone ON chats(tenant_id, phone);
CREATE INDEX idx_chat_messages_tenant_phone ON chat_messages(tenant_id, phone);
CREATE INDEX idx_dados_cliente_tenant_telefone ON dados_cliente(tenant_id, telefone);
CREATE INDEX idx_n8n_chat_histories_tenant_session ON n8n_chat_histories(tenant_id, session_id);
```

### 6. Remover Arquivos Manus (Opcional)

Arquivos que podem ser removidos (se não forem mais usados):
- `server/_core/sdk.ts` (se não for mais usado)
- `server/_core/types/manusTypes.ts` (se não for mais usado)
- `server/_core/oauth.ts` (já não é mais usado)

### 7. Limpar Referências em Outros Arquivos

Verificar e limpar:
- `client/src/_core/hooks/useAuth.ts` - Remover referências "manus-runtime-user-info"
- `server/_core/llm.ts` - Verificar URL forge (pode manter se for útil)
- `server/_core/notification.ts` - Verificar se ainda usa Manus
- `server/_core/map.ts` - Verificar referências
- `server/storage.ts` - Verificar referências
- Documentação - Limpar referências

---

## ⚠️ ATENÇÃO

### Problemas Conhecidos

1. **Enums no PostgreSQL**: Os enums precisam ser criados no banco antes das tabelas. O Drizzle pode fazer isso automaticamente, mas verifique.

2. **updatedAt**: No PostgreSQL, `defaultNow().onUpdateNow()` pode não funcionar automaticamente. Pode precisar de trigger.

3. **Migração de Dados**: Se você tem dados no MySQL, precisa criar script de migração.

---

## 🧪 TESTES

Após migração, testar:
- [ ] Login de admin
- [ ] Login de cliente
- [ ] Criação de tenant
- [ ] Criação de plano
- [ ] Configuração de agente
- [ ] Todas as operações CRUD

---

## 📝 CHECKLIST FINAL

- [ ] Remover `mysql2` do package.json
- [ ] Adicionar `postgres` ao package.json
- [ ] Atualizar `DATABASE_URL` para formato PostgreSQL
- [ ] Executar `pnpm db:push` para gerar migrações
- [ ] Criar tabelas do workflow N8N no PostgreSQL
- [ ] Migrar dados (se necessário)
- [ ] Testar todas as funcionalidades
- [ ] Remover arquivos Manus não usados
- [ ] Limpar documentação

---

## 🚀 Próximo Passo

**Execute os comandos acima e me avise quando estiver pronto para continuar!**

