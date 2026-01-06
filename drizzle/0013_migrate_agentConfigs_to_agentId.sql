-- Migration: Alterar agentConfigs de tenantId para agentId
-- Data: 2026-01-06
-- Descrição: Migra a tabela agentConfigs para usar agentId em vez de tenantId

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
WHERE "agentId" IS NULL AND EXISTS (
  SELECT 1 FROM agents a WHERE a."tenantId" = ac."tenantId"
);

-- 3. Para registros sem agente correspondente, criar agente automaticamente
-- (isso garante que todos os agentConfigs tenham um agentId)
DO $$
DECLARE
  config_record RECORD;
  new_agent_id integer;
BEGIN
  FOR config_record IN 
    SELECT ac.id, ac."tenantId" 
    FROM "agentConfigs" ac 
    WHERE ac."agentId" IS NULL
  LOOP
    -- Criar agente para este tenant
    INSERT INTO agents ("tenantId", "name", "status", "isActive", "createdAt", "updatedAt")
    VALUES (
      config_record."tenantId",
      'Agente ' || config_record."tenantId",
      'active',
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_agent_id;
    
    -- Atualizar agentConfig com o novo agentId
    UPDATE "agentConfigs"
    SET "agentId" = new_agent_id
    WHERE id = config_record.id;
  END LOOP;
END $$;

-- 4. Tornar agentId NOT NULL (após preencher todos)
ALTER TABLE "agentConfigs" 
ALTER COLUMN "agentId" SET NOT NULL;

-- 5. Adicionar constraint unique em agentId
ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_agentId_unique",
ADD CONSTRAINT "agentConfigs_agentId_unique" UNIQUE ("agentId");

-- 6. Remover constraint unique antiga de tenantId (se existir)
ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_tenantId_unique";

-- 7. Remover coluna tenantId (após migração completa)
ALTER TABLE "agentConfigs" 
DROP COLUMN IF EXISTS "tenantId";

-- 8. Adicionar foreign key para agents (opcional, mas recomendado)
ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_agentId_agents_id_fk",
ADD CONSTRAINT "agentConfigs_agentId_agents_id_fk" 
FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE;

