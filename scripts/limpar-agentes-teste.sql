-- ============================================
-- SCRIPT PARA LIMPAR AGENTES DE TESTE
-- ============================================
-- Execute para remover todos os agents e resetar agentConfigs
-- ============================================

-- ============================================
-- PASSO 1: Desvincular agentConfigs dos agents
-- ============================================
-- Remove a referência agentId dos configs
-- ============================================

UPDATE "agentConfigs"
SET "agentId" = NULL
WHERE "agentId" IS NOT NULL;

-- Verificar
SELECT 
  COUNT(*) as "configs_desvinculados",
  COUNT(*) FILTER (WHERE "agentId" IS NULL) as "configs_sem_agentId"
FROM "agentConfigs";


-- ============================================
-- PASSO 2: Remover constraint unique (se existir)
-- ============================================
-- Para poder limpar tudo
-- ============================================

ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_agentId_key";

-- Verificar
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'agentConfigs_agentId_key'
    ) THEN 'Constraint ainda existe'
    ELSE 'Constraint removida com sucesso'
  END as "status_constraint";


-- ============================================
-- PASSO 3: Deletar todos os agents
-- ============================================
-- CUIDADO: Isso vai deletar TODOS os agents!
-- ============================================

-- Ver quantos agents existem antes
SELECT COUNT(*) as "agents_antes" FROM "agents";

-- Listar agents que serão deletados
SELECT 
  id,
  name,
  "tenantId",
  "n8nWorkflowId",
  "evolutionInstanceName",
  "chatwootInboxId"
FROM "agents";

-- DELETAR TODOS OS AGENTS
DELETE FROM "agents";

-- Verificar
SELECT COUNT(*) as "agents_depois" FROM "agents";
-- Deve retornar 0


-- ============================================
-- PASSO 4: Verificação final
-- ============================================
-- ============================================

SELECT 
  (SELECT COUNT(*) FROM "agents") as "total_agents",
  (SELECT COUNT(*) FROM "agentConfigs") as "total_configs",
  (SELECT COUNT(*) FROM "agentConfigs" WHERE "agentId" IS NOT NULL) as "configs_com_agentId",
  (SELECT COUNT(*) FROM "agentConfigs" WHERE "agentId" IS NULL) as "configs_sem_agentId";

-- ============================================
-- PRONTO! Agora você pode começar do zero
-- ============================================
-- Quando criar novos agentes, eles serão criados corretamente
-- ============================================

