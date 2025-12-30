-- ============================================
-- Adicionar novos valores ao enum eventType
-- Execute este SQL no banco PostgreSQL
-- ============================================

-- PASSO 1: Descobrir o nome exato do enum
-- Execute esta query primeiro para ver o nome do enum:
SELECT typname FROM pg_type WHERE typtype = 'e' AND (typname LIKE '%event%' OR typname LIKE '%Event%');

-- PASSO 2: Baseado no resultado acima, execute os comandos abaixo
-- Substitua "eventType" pelo nome que apareceu na query acima

-- Se o resultado for "eventType" (sem aspas):
ALTER TYPE eventType ADD VALUE 'bulk_delete_all_clients';
ALTER TYPE eventType ADD VALUE 'bulk_delete_test_clients';
ALTER TYPE eventType ADD VALUE 'agent_activated';

-- Se o resultado for algo diferente, use esse nome. Exemplo:
-- ALTER TYPE "eventType" ADD VALUE 'bulk_delete_all_clients';
-- ALTER TYPE eventtype ADD VALUE 'bulk_delete_all_clients';  (se for lowercase)

-- PASSO 3: Verificar se foram adicionados
SELECT unnest(enum_range(NULL::eventType)) AS event_type ORDER BY event_type;

-- ============================================
-- NOTAS:
-- - Se der erro "already exists", ignore - significa que já foram adicionados
-- - Se der erro "type does not exist", verifique o nome com a query do PASSO 1
-- ============================================

