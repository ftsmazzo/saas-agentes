-- ============================================
-- SCRIPT DE MIGRAÇÃO DE DADOS - PASSO A PASSO
-- ============================================
-- Execute cada bloco SEPARADAMENTE no PgAdmin
-- Se um passo falhar, continue com o próximo
-- ============================================

-- ============================================
-- PASSO 1: Criar agents a partir de agentConfigs existentes
-- ============================================
-- Execute este bloco primeiro
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
  t."n8nWorkflowId",
  t."evolutionInstanceName",
  t."evolutionApiKey",
  t."chatwootInboxId",
  ac."createdAt",
  NOW() AS "updatedAt"
FROM "agentConfigs" ac
INNER JOIN "tenants" t ON ac."tenantId" = t.id
WHERE ac."agentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "agents" a 
    WHERE a."tenantId" = ac."tenantId" 
      AND a."name" = COALESCE(t."companyName", 'Cliente') || ' - Agente'
  );

-- Verificar resultado
SELECT COUNT(*) as "agents_criados" FROM "agents";


-- ============================================
-- PASSO 2: Atualizar agentConfigs para referenciar agents
-- ============================================
-- Execute este bloco DEPOIS do PASSO 1
-- ============================================

UPDATE "agentConfigs" ac
SET "agentId" = a.id
FROM "agents" a
WHERE ac."tenantId" = a."tenantId"
  AND ac."agentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "agentConfigs" ac2 
    WHERE ac2."agentId" = a.id
  );

-- Verificar resultado
SELECT 
  COUNT(*) as "configs_atualizados",
  COUNT(*) FILTER (WHERE "agentId" IS NOT NULL) as "configs_com_agentId",
  COUNT(*) FILTER (WHERE "agentId" IS NULL) as "configs_sem_agentId"
FROM "agentConfigs";


-- ============================================
-- PASSO 3: Remover duplicatas (se houver)
-- ============================================
-- Execute este bloco DEPOIS do PASSO 2
-- ============================================

DELETE FROM "agentConfigs" ac1
USING "agentConfigs" ac2
WHERE ac1."agentId" = ac2."agentId"
  AND ac1.id < ac2.id
  AND ac1."agentId" IS NOT NULL;

-- Verificar se há duplicatas
SELECT 
  "agentId",
  COUNT(*) as "quantidade"
FROM "agentConfigs"
WHERE "agentId" IS NOT NULL
GROUP BY "agentId"
HAVING COUNT(*) > 1;


-- ============================================
-- PASSO 4: Adicionar constraint unique de agentId
-- ============================================
-- Execute este bloco DEPOIS do PASSO 3
-- ============================================

-- Verificar se constraint já existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'agentConfigs_agentId_key'
    ) THEN 'Constraint já existe'
    ELSE 'Constraint não existe - será criada'
  END as "status_constraint";

-- Criar constraint (execute apenas se não existir)
ALTER TABLE "agentConfigs" 
ADD CONSTRAINT "agentConfigs_agentId_key" 
UNIQUE ("agentId");

-- Se der erro "already exists", pode ignorar


-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute este bloco para verificar tudo
-- ============================================

SELECT 
  (SELECT COUNT(*) FROM "agents") as "total_agents",
  (SELECT COUNT(*) FROM "agentConfigs") as "total_configs",
  (SELECT COUNT(*) FROM "agentConfigs" WHERE "agentId" IS NOT NULL) as "configs_com_agentId",
  (SELECT COUNT(*) FROM "agentConfigs" WHERE "agentId" IS NULL) as "configs_sem_agentId";

-- Listar agents criados
SELECT 
  a.id,
  a.name,
  a."tenantId",
  t."companyName",
  a."n8nWorkflowId",
  a."evolutionInstanceName",
  a."chatwootInboxId"
FROM "agents" a
INNER JOIN "tenants" t ON a."tenantId" = t.id
ORDER BY a.id;

-- Listar agentConfigs vinculados
SELECT 
  ac.id,
  ac."agentId",
  a.name as "agentName",
  a."tenantId"
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
ORDER BY ac.id;

