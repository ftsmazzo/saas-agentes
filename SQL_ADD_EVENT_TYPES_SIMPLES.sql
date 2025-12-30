-- Adicionar novos valores ao enum eventType no PostgreSQL
-- Execute este SQL no banco PostgreSQL

-- Primeiro, descobrir o nome exato do enum
-- Execute esta query para ver o nome:
SELECT typname FROM pg_type WHERE typtype = 'e' AND typname LIKE '%event%';

-- Depois, execute os comandos abaixo usando o nome retornado
-- (substitua "eventType" pelo nome que apareceu na query acima)

-- Se o nome for "eventType" (sem aspas):
ALTER TYPE eventType ADD VALUE 'bulk_delete_all_clients';
ALTER TYPE eventType ADD VALUE 'bulk_delete_test_clients';
ALTER TYPE eventType ADD VALUE 'agent_activated';

-- Se o nome for "eventType" (com aspas, caso o Drizzle tenha criado assim):
-- ALTER TYPE "eventType" ADD VALUE 'bulk_delete_all_clients';
-- ALTER TYPE "eventType" ADD VALUE 'bulk_delete_test_clients';
-- ALTER TYPE "eventType" ADD VALUE 'agent_activated';

-- Se der erro "already exists", ignore - significa que já foram adicionados
-- Se der erro "type does not exist", verifique o nome com a query acima

