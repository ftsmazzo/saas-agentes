# 📋 Instruções para Executar Migration

## ⚠️ PROBLEMA

A tabela `agentConfigs` precisa ser migrada de `tenantId` para `agentId`, mas a migration `0013` pode falhar se `tenantId` já foi removido.

## ✅ SOLUÇÃO

Execute a migration `0014` que é mais robusta e funciona em qualquer situação.

---

## 🔧 COMO EXECUTAR

### Opção 1: Via Script (Recomendado)

```bash
# No servidor ou localmente com DATABASE_URL configurado
node scripts/run-migration-agentConfigs.mjs
```

**OU** execute diretamente a migration `0014`:

```bash
psql $DATABASE_URL -f drizzle/0014_fix_agentConfigs_agentId_null.sql
```

### Opção 2: Manualmente no PostgreSQL

1. Conecte ao banco de dados PostgreSQL
2. Execute o conteúdo do arquivo `drizzle/0014_fix_agentConfigs_agentId_null.sql`

### Opção 3: Via EasyPanel (Terminal do Container)

1. Acesse o terminal do container da aplicação no EasyPanel
2. Execute:
```bash
psql $DATABASE_URL -f /app/drizzle/0014_fix_agentConfigs_agentId_null.sql
```

---

## ✅ O QUE A MIGRATION FAZ

1. **Verifica** se há `agentConfigs` sem `agentId`
2. **Cria agentes automaticamente** para configs órfãs
3. **Garante** que todos os `agentConfigs` tenham `agentId`
4. **Adiciona constraints** (unique, foreign key)
5. **Torna `agentId` NOT NULL**

---

## 🧪 VERIFICAR SE FUNCIONOU

Execute esta query para verificar:

```sql
-- Verificar se há configs sem agentId
SELECT COUNT(*) as configs_sem_agentId
FROM "agentConfigs"
WHERE "agentId" IS NULL;
-- Deve retornar 0

-- Verificar se todos os configs têm agentId
SELECT COUNT(*) as total_configs,
       COUNT("agentId") as configs_com_agentId
FROM "agentConfigs";
-- Os dois números devem ser iguais
```

---

## ⚠️ IMPORTANTE

- A migration é **idempotente** - pode ser executada múltiplas vezes sem problemas
- Ela **não remove** a coluna `tenantId` (isso deve ser feito manualmente depois, se necessário)
- Ela **cria agentes automaticamente** se necessário

---

**Após executar a migration, o sistema deve funcionar corretamente!** ✅

