# 🧹 Limpeza de Referências Manus + Decisão de Banco de Dados

## 📊 Situação Atual

### 1. Referências ao Manus Encontradas

#### A. Dependências (package.json)
- ✅ `vite-plugin-manus-runtime` - Plugin do Vite

#### B. Arquivos com Referências
- ✅ `vite.config.ts` - Plugin e domínios manus
- ✅ `client/src/components/ManusDialog.tsx` - Componente completo
- ✅ `server/_core/sdk.ts` - SDK do Manus
- ✅ `server/_core/types/manusTypes.ts` - Tipos do Manus
- ✅ `client/src/_core/hooks/useAuth.ts` - Hook de autenticação
- ✅ `server/_core/oauth.ts` - OAuth do Manus
- ✅ `server/_core/notification.ts` - Notificações do Manus
- ✅ `server/_core/map.ts` - Google Maps (referência Manus)
- ✅ `server/_core/llm.ts` - URL Forge API (manus.im)
- ✅ `server/_core/dataApi.ts` - Referência Manus
- ✅ `server/storage.ts` - Storage helpers Manus
- ✅ Vários arquivos de documentação

#### C. URLs e Domínios
- ✅ Domínios manus em `vite.config.ts`:
  - `.manuspre.computer`
  - `.manus.computer`
  - `.manus-asia.computer`
  - `.manuscomputer.ai`
  - `.manusvm.computer`

#### D. Variáveis de Ambiente
- ✅ `VITE_APP_ID` - App ID do Manus
- ✅ `OAUTH_SERVER_URL` - Servidor OAuth do Manus
- ✅ `OWNER_OPEN_ID` - OpenID do proprietário (Manus)

---

## 🗄️ Situação do Banco de Dados

### Estado Atual

#### **MySQL** (Projeto Principal)
- ✅ **Schema**: `drizzle/schema.ts` usa `mysqlTable`, `mysqlEnum`
- ✅ **Conexão**: `drizzle-orm/mysql2`
- ✅ **Uso**: Todas as tabelas principais (users, tenants, plans, agentConfigs, etc.)
- ✅ **Status**: Instalado só por causa do projeto, não usa em outros lugares

#### **PostgreSQL/Supabase** (Workflow N8N)
- ✅ **Workflow N8N**: Usa Supabase (PostgreSQL) para:
  - Tabelas `chats`, `chat_messages`, `dados_cliente`
  - Histórico de conversas (`n8n_chat_histories`)
  - Memória do agente (Postgres Chat Memory)
- ✅ **Configuração**: Há sistema de configuração PostgreSQL Master no admin
- ✅ **Status**: Já está configurado e funcionando

---

## 🎯 Proposta de Decisão

### Opção A: Migrar Tudo para PostgreSQL ✅ RECOMENDADO

**Vantagens:**
- ✅ PostgreSQL é mais robusto para aplicações complexas
- ✅ Já está configurado (Supabase)
- ✅ Workflow N8N já usa PostgreSQL
- ✅ Melhor suporte a JSON e arrays nativos
- ✅ Extensões úteis (vector, full-text search)
- ✅ Um único banco para tudo (simplicidade)

**Desvantagens:**
- ⚠️ Precisa migrar schema e dados
- ⚠️ Precisa atualizar código (drizzle-orm/mysql2 → drizzle-orm/postgres-js)
- ⚠️ Algumas queries podem precisar ajuste (sintaxe diferente)

**Esforço:** MÉDIO (2-3 dias)

---

### Opção B: Manter MySQL Principal + PostgreSQL para Histórico

**Vantagens:**
- ✅ Não precisa migrar dados principais
- ✅ PostgreSQL só para histórico (já funciona)

**Desvantagens:**
- ❌ Dois bancos para gerenciar
- ❌ Complexidade desnecessária
- ❌ MySQL instalado só para isso

**Esforço:** BAIXO (apenas ajustes)

---

### Opção C: Migrar Tudo para MySQL

**Vantagens:**
- ✅ Já está no projeto
- ✅ Não precisa configurar PostgreSQL

**Desvantagens:**
- ❌ Workflow N8N usa Supabase (PostgreSQL)
- ❌ Precisa adaptar workflow para MySQL
- ❌ MySQL menos robusto para casos complexos
- ❌ Supabase já configurado seria desperdiçado

**Esforço:** ALTO (migrar workflow + adaptar)

---

## ✅ RECOMENDAÇÃO: Opção A (PostgreSQL)

### Justificativa:
1. **Já está configurado**: Supabase/PostgreSQL já está funcionando
2. **Workflow usa PostgreSQL**: N8N já usa PostgreSQL, manter consistência
3. **Melhor para o futuro**: PostgreSQL é mais robusto
4. **Um único banco**: Simplicidade de gerenciamento
5. **MySQL não é usado**: Você mesmo disse que instalou só por causa do projeto

---

## 📋 Plano de Ação

### FASE 1: Remover Referências Manus

#### 1.1 Remover Dependências
```bash
pnpm remove vite-plugin-manus-runtime
```

#### 1.2 Arquivos para Deletar
- [ ] `client/src/components/ManusDialog.tsx`
- [ ] `server/_core/sdk.ts` (ou limpar referências Manus)
- [ ] `server/_core/types/manusTypes.ts` (ou limpar)
- [ ] `server/_core/oauth.ts` (ou adaptar para sistema próprio)
- [ ] `server/_core/notification.ts` (ou adaptar)
- [ ] `server/_core/map.ts` (ou limpar referências)
- [ ] `server/storage.ts` (ou limpar referências)

#### 1.3 Arquivos para Modificar
- [ ] `vite.config.ts` - Remover plugin e domínios manus
- [ ] `package.json` - Remover dependência
- [ ] `server/_core/llm.ts` - Remover URL manus.im (usar OpenAI direto)
- [ ] `server/_core/dataApi.ts` - Limpar referências
- [ ] `client/src/_core/hooks/useAuth.ts` - Remover referências Manus
- [ ] `server/_core/env.ts` - Remover variáveis Manus
- [ ] Documentação - Limpar referências

#### 1.4 Variáveis de Ambiente para Remover
- [ ] `VITE_APP_ID`
- [ ] `OAUTH_SERVER_URL`
- [ ] `OWNER_OPEN_ID` (ou adaptar para sistema próprio)

---

### FASE 2: Migrar para PostgreSQL

#### 2.1 Atualizar Dependências
```bash
# Remover MySQL
pnpm remove mysql2

# Adicionar PostgreSQL
pnpm add postgres
pnpm add -D @types/pg
```

#### 2.2 Migrar Schema (drizzle/schema.ts)
```typescript
// ANTES (MySQL)
import { mysqlTable, mysqlEnum } from "drizzle-orm/mysql-core";

// DEPOIS (PostgreSQL)
import { pgTable, pgEnum } from "drizzle-orm/pg-core";
```

**Mudanças necessárias:**
- `mysqlTable` → `pgTable`
- `mysqlEnum` → `pgEnum`
- `int().autoincrement()` → `serial()` ou `integer().generatedAlwaysAsIdentity()`
- `text()` → `text()` (mesmo)
- `varchar()` → `varchar()` (mesmo)
- `timestamp()` → `timestamp()` (mesmo)
- `boolean()` → `boolean()` (mesmo)

#### 2.3 Atualizar Conexão (server/db.ts)
```typescript
// ANTES
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// DEPOIS
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
```

#### 2.4 Migrar Dados
- [ ] Exportar dados do MySQL
- [ ] Importar para PostgreSQL
- [ ] Validar integridade

#### 2.5 Atualizar Queries
- [ ] Verificar sintaxe (algumas queries podem precisar ajuste)
- [ ] Testar todas as operações CRUD

---

### FASE 3: Integrar Workflow N8N com PostgreSQL

#### 3.1 Unificar Banco
- [ ] Criar tabelas do workflow no mesmo PostgreSQL
- [ ] Adicionar `tenant_id` em todas as tabelas do workflow
- [ ] Atualizar workflow para usar banco unificado

#### 3.2 Tabelas Necessárias no PostgreSQL
```sql
-- Tabelas do workflow (já existem no Supabase, migrar para PostgreSQL principal)
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

---

## 📝 Checklist de Execução

### Limpeza Manus
- [ ] Remover `vite-plugin-manus-runtime` do package.json
- [ ] Remover plugin do vite.config.ts
- [ ] Deletar ManusDialog.tsx
- [ ] Limpar/remover sdk.ts, oauth.ts, notification.ts
- [ ] Remover domínios manus do vite.config.ts
- [ ] Limpar referências em useAuth.ts
- [ ] Atualizar env.ts
- [ ] Limpar documentação

### Migração PostgreSQL
- [ ] Instalar dependências PostgreSQL
- [ ] Migrar schema.ts (mysql → pg)
- [ ] Atualizar db.ts (mysql2 → postgres-js)
- [ ] Migrar dados do MySQL para PostgreSQL
- [ ] Testar todas as operações
- [ ] Atualizar drizzle.config.ts
- [ ] Remover MySQL do sistema

### Integração Workflow
- [ ] Criar tabelas do workflow no PostgreSQL principal
- [ ] Adicionar tenant_id em todas as tabelas
- [ ] Atualizar workflow N8N para usar banco unificado
- [ ] Testar workflow completo

---

## ⚠️ Pontos de Atenção

1. **Backup**: Fazer backup completo antes de migrar
2. **Testes**: Testar tudo após migração
3. **Downtime**: Planejar janela de manutenção
4. **Rollback**: Ter plano de rollback se necessário

---

## 🚀 Próximos Passos

1. **Confirmar decisão**: PostgreSQL ou manter MySQL?
2. **Criar branch**: `cleanup/manus-removal-postgres-migration`
3. **Executar limpeza Manus**: Remover todas as referências
4. **Migrar para PostgreSQL**: Schema + dados + código
5. **Integrar workflow**: Unificar banco
6. **Testar tudo**: Validar funcionamento completo

---

## 💬 Decisão Necessária

**Por favor, confirme:**
1. ✅ Remover todas as referências ao Manus?
2. ✅ Migrar para PostgreSQL (Opção A) ou manter MySQL (Opção C)?
3. ✅ Unificar banco (workflow + projeto principal no mesmo PostgreSQL)?

**Após confirmação, começamos a implementação!** 🚀

