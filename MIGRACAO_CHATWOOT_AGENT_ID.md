# 🔧 Migração: Adicionar coluna chatwootAgentId

## Problema
A coluna `chatwootAgentId` foi adicionada ao schema TypeScript, mas não existe no banco de dados PostgreSQL, causando erro ao fazer login.

## Solução

### Opção 1: Executar SQL diretamente no banco (RECOMENDADO)

Execute este SQL no seu banco PostgreSQL (via Supabase Dashboard, psql, ou EasyPanel):

```sql
ALTER TABLE "tenants" 
ADD COLUMN IF NOT EXISTS "chatwootAgentId" INTEGER;

COMMENT ON COLUMN "tenants"."chatwootAgentId" IS 'ID do Agente (User) criado no Chatwoot para o tenant';
```

### Opção 2: Usar Drizzle Kit (se tiver acesso ao terminal)

```bash
# Gerar migration
pnpm db:push

# Ou executar migration manualmente
psql $DATABASE_URL -f drizzle/0012_add_chatwoot_agent_id.sql
```

## Verificação

Após executar, verifique se a coluna foi criada:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name = 'chatwootAgentId';
```

## Importante

- A coluna é **opcional** (pode ser NULL)
- Tenants existentes terão `chatwootAgentId = NULL`
- Novos tenants terão o agente criado automaticamente durante o provisionamento

