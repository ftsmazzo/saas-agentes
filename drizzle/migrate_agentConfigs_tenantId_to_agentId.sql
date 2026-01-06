-- Migration: Alterar agentConfigs de tenantId para agentId
-- Data: 2026-01-06

-- 1. Adicionar nova coluna agentId (temporariamente nullable)
ALTER TABLE "agentConfigs" 
ADD COLUMN IF NOT EXISTS "agentId" integer;

-- 2. Preencher agentId com base no primeiro agente de cada tenant
-- (assumindo que cada tenant tem pelo menos um agente)
UPDATE "agentConfigs" ac
SET "agentId" = (
  SELECT a.id 
  FROM agents a 
  WHERE a."tenantId" = ac."tenantId" 
  ORDER BY a."createdAt" ASC 
  LIMIT 1
)
WHERE "agentId" IS NULL;

-- 3. Tornar agentId NOT NULL (após preencher)
ALTER TABLE "agentConfigs" 
ALTER COLUMN "agentId" SET NOT NULL;

-- 4. Adicionar constraint unique em agentId
ALTER TABLE "agentConfigs" 
ADD CONSTRAINT "agentConfigs_agentId_unique" UNIQUE ("agentId");

-- 5. Remover constraint unique antiga de tenantId (se existir)
ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_tenantId_unique";

-- 6. Remover coluna tenantId (após migração)
ALTER TABLE "agentConfigs" 
DROP COLUMN IF EXISTS "tenantId";

-- 7. Adicionar foreign key para agents (opcional, mas recomendado)
ALTER TABLE "agentConfigs" 
ADD CONSTRAINT "agentConfigs_agentId_agents_id_fk" 
FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE;

