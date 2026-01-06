-- Migration: Corrigir agentConfigs sem agentId (quando tenantId já foi removido)
-- Data: 2026-01-06
-- Descrição: Preenche agentId para agentConfigs que estão NULL

-- 1. Verificar se há agentConfigs sem agentId
DO $$
DECLARE
  config_record RECORD;
  new_agent_id integer;
  tenant_id_for_agent integer;
  agent_count integer;
BEGIN
  -- Contar quantos agentConfigs sem agentId existem
  SELECT COUNT(*) INTO agent_count
  FROM "agentConfigs"
  WHERE "agentId" IS NULL;
  
  IF agent_count > 0 THEN
    RAISE NOTICE 'Encontrados % agentConfigs sem agentId. Criando agentes...', agent_count;
    
    -- Para cada config sem agentId, criar um agente
    FOR config_record IN 
      SELECT ac.id
      FROM "agentConfigs" ac 
      WHERE ac."agentId" IS NULL
    LOOP
      -- Tentar encontrar um tenant através de algum agente existente
      -- Usar o primeiro tenant que tiver agentes
      SELECT a."tenantId" INTO tenant_id_for_agent
      FROM agents a
      ORDER BY a."createdAt" ASC
      LIMIT 1;
      
      IF tenant_id_for_agent IS NULL THEN
        -- Se não há agentes, usar tenantId = 1 (assumindo que existe)
        -- Ou criar um tenant genérico se necessário
        tenant_id_for_agent := 1;
        RAISE NOTICE 'Nenhum agente encontrado. Usando tenantId = 1 para config %', config_record.id;
      END IF;
      
      -- Criar agente para este config
      INSERT INTO agents ("tenantId", "name", "status", "isActive", "createdAt", "updatedAt")
      VALUES (
        tenant_id_for_agent,
        'Agente Migrado ' || config_record.id,
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
      
      RAISE NOTICE 'Criado agente % para config %', new_agent_id, config_record.id;
    END LOOP;
  ELSE
    RAISE NOTICE 'Todos os agentConfigs já têm agentId. Nada a fazer.';
  END IF;
END $$;

-- 2. Garantir que agentId seja NOT NULL (se ainda não for)
DO $$
BEGIN
  -- Verificar se há algum NULL restante
  IF EXISTS (SELECT 1 FROM "agentConfigs" WHERE "agentId" IS NULL) THEN
    RAISE EXCEPTION 'Ainda existem agentConfigs sem agentId após tentativa de correção';
  END IF;
  
  -- Tornar NOT NULL se ainda não for
  BEGIN
    ALTER TABLE "agentConfigs" 
    ALTER COLUMN "agentId" SET NOT NULL;
    RAISE NOTICE 'Coluna agentId agora é NOT NULL';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Coluna agentId já é NOT NULL ou erro ao alterar: %', SQLERRM;
  END;
END $$;

-- 3. Garantir constraint unique
ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_agentId_unique",
ADD CONSTRAINT "agentConfigs_agentId_unique" UNIQUE ("agentId");

-- 4. Garantir foreign key
ALTER TABLE "agentConfigs" 
DROP CONSTRAINT IF EXISTS "agentConfigs_agentId_agents_id_fk",
ADD CONSTRAINT "agentConfigs_agentId_agents_id_fk" 
FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE;

