# 🗄️ Guia de Migração: MySQL → PostgreSQL

## 📋 Passo a Passo

### 1. Instalar Dependências PostgreSQL

```bash
# Remover MySQL
pnpm remove mysql2

# Adicionar PostgreSQL
pnpm add postgres
pnpm add -D @types/pg
```

### 2. Atualizar Schema (drizzle/schema.ts)

**Mudanças necessárias:**
- `mysqlTable` → `pgTable`
- `mysqlEnum` → `pgEnum`
- `int().autoincrement()` → `serial()` ou `integer().generatedAlwaysAsIdentity()`
- `timestamp()` → `timestamp()` (mesmo, mas pode usar `timestamptz`)
- `text()` → `text()` (mesmo)
- `varchar()` → `varchar()` (mesmo)
- `boolean()` → `boolean()` (mesmo)

### 3. Atualizar Conexão (server/db.ts)

**ANTES:**
```typescript
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
```

**DEPOIS:**
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
```

### 4. Atualizar drizzle.config.ts

**ANTES:**
```typescript
dialect: "mysql",
```

**DEPOIS:**
```typescript
dialect: "postgresql",
```

### 5. Variável de Ambiente

A `DATABASE_URL` deve estar no formato PostgreSQL:
```
postgresql://user:password@host:port/database
```

### 6. Migrar Dados

Criar script de migração para copiar dados do MySQL para PostgreSQL.

### 7. Tabelas do Workflow N8N

Criar tabelas do workflow no PostgreSQL com `tenant_id`.

