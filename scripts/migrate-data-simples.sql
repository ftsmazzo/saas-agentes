-- ============================================
-- SCRIPT DE MIGRAÇÃO DE DADOS - VERSÃO SIMPLES
-- ============================================
-- Execute CADA comando SEPARADAMENTE no PgAdmin
-- Cole e execute um por vez
-- ============================================

-- ============================================
-- COMANDO 1: Criar agents
-- ============================================
-- Cole este comando e execute (F5)
-- ============================================

INSERT INTO "agents" (
  "tenantId",
  "name",
  "description",
  "status",
  "isActive",
  "n8nWorkflowId",
  "evolutionInstanceName",
  "evolutionApiKey",
  "chatwootInboxId",
  "createdAt",
  "updatedAt"
)
SELECT 
  ac."tenantId",
  COALESCE(t."companyName", 'Cliente') || ' - Agente' AS "name",
  'Agente migrado automaticamente de ' || COALESCE(t."companyName", 'Cliente') AS "description",
  'active'::"agentStatus" AS "status",
  true AS "isActive",
  NULL AS "n8nWorkflowId",  -- Será configurado depois quando o agente for provisionado
  NULL AS "evolutionInstanceName",  -- Será configurado depois quando o agente for provisionado
  NULL AS "evolutionApiKey",  -- Será configurado depois quando o agente for provisionado
  NULL AS "chatwootInboxId",  -- Será configurado depois quando o agente for provisionado
  ac."createdAt",
  NOW() AS "updatedAt"
FROM "agentConfigs" ac
INNER JOIN "tenants" t ON ac."tenantId" = t.id
WHERE ac."agentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "agents" a 
    WHERE a."tenantId" = ac."tenantId"
  );


-- ============================================
-- COMANDO 2: Verificar agents criados
-- ============================================
-- Execute para ver quantos agents foram criados
-- ============================================

SELECT COUNT(*) as "agents_criados" FROM "agents";


-- ============================================
-- COMANDO 3: Atualizar agentConfigs
-- ============================================
-- Execute DEPOIS do comando 1
-- ============================================

UPDATE "agentConfigs" ac
SET "agentId" = a.id
FROM "agents" a
WHERE ac."tenantId" = a."tenantId"
  AND ac."agentId" IS NULL;


-- ============================================
-- COMANDO 4: Verificar configs atualizados
-- ============================================
-- Execute para ver quantos configs foram atualizados
-- ============================================

SELECT 
  COUNT(*) as "total_configs",
  COUNT(*) FILTER (WHERE "agentId" IS NOT NULL) as "configs_com_agentId",
  COUNT(*) FILTER (WHERE "agentId" IS NULL) as "configs_sem_agentId"
FROM "agentConfigs";


-- ============================================
-- COMANDO 5: Remover duplicatas (se houver)
-- ============================================
-- Execute apenas se houver duplicatas
-- ============================================

DELETE FROM "agentConfigs" ac1
USING "agentConfigs" ac2
WHERE ac1."agentId" = ac2."agentId"
  AND ac1.id < ac2.id
  AND ac1."agentId" IS NOT NULL;


-- ============================================
-- COMANDO 6: Adicionar constraint unique
-- ============================================
-- Execute DEPOIS dos comandos anteriores
-- Se der erro "already exists", pode ignorar
-- ============================================

ALTER TABLE "agentConfigs" 
ADD CONSTRAINT "agentConfigs_agentId_key" 
UNIQUE ("agentId");


-- ============================================
-- COMANDO 7: Verificação final
-- ============================================
-- Execute para ver o resultado final
-- ============================================

SELECT 
  (SELECT COUNT(*) FROM "agents") as "total_agents",
  (SELECT COUNT(*) FROM "agentConfigs") as "total_configs",
  (SELECT COUNT(*) FROM "agentConfigs" WHERE "agentId" IS NOT NULL) as "configs_com_agentId",
  (SELECT COUNT(*) FROM "agentConfigs" WHERE "agentId" IS NULL) as "configs_sem_agentId";

