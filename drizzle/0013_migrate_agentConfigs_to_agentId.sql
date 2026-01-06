-- Migration: Alterar agentConfigs de tenantId para agentId
-- Data: 2026-01-06
-- Descrição: Migra a tabela agentConfigs para usar agentId em vez de tenantId

-- 1. Adicionar nova coluna agentId (temporariamente nullable)
ALTER TABLE "agentConfigs" 
ADD COLUMN IF NOT EXISTS "agentId" integer;

-- 2. Verificar se a coluna tenantId ainda existe antes de tentar migrar
-- Se não existir, significa que a migration já foi executada parcialmente
DO $$
DECLARE
  tenant_id_exists boolean;
BEGIN
  -- Verificar se a coluna tenantId existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'agentConfigs' 
      AND column_name = 'tenantId'
  ) INTO tenant_id_exists;
  
  -- Só executar migração de dados se tenantId ainda existir
  IF tenant_id_exists THEN
    -- Preencher agentId com base no primeiro agente de cada tenant
    UPDATE "agentConfigs" ac
    SET "agentId" = (
      SELECT a.id 
      FROM agents a 
      WHERE a."tenantId" = ac."tenantId" 
      ORDER BY a."createdAt" ASC 
      LIMIT 1
    )
    WHERE "agentId" IS NULL 
      AND EXISTS (
        SELECT 1 FROM agents a WHERE a."tenantId" = ac."tenantId"
      );
    
    -- Para registros sem agente correspondente, criar agente automaticamente
    -- (isso garante que todos os agentConfigs tenham um agentId)
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
    END;
  ELSE
    -- Se tenantId não existe, apenas garantir que todos os agentConfigs tenham agentId
    -- Criar agentes para configs órfãs (sem agentId e sem tenantId para referência)
    DECLARE
      config_record RECORD;
      new_agent_id integer;
      tenant_id_from_agent integer;
    BEGIN
      FOR config_record IN 
        SELECT ac.id
        FROM "agentConfigs" ac 
        WHERE ac."agentId" IS NULL
      LOOP
        -- Tentar encontrar um tenant através de algum agente existente
        -- Se não encontrar, criar um agente genérico
        SELECT a."tenantId" INTO tenant_id_from_agent
        FROM agents a
        ORDER BY a."createdAt" ASC
        LIMIT 1;
        
        IF tenant_id_from_agent IS NULL THEN
          -- Se não há agentes, criar um tenant e agente genérico
          -- (caso extremo - não deveria acontecer)
          RAISE NOTICE 'Nenhum agente encontrado. Pulando criação automática para config %', config_record.id;
        ELSE
          -- Criar agente para o tenant encontrado
          INSERT INTO agents ("tenantId", "name", "status", "isActive", "createdAt", "updatedAt")
          VALUES (
            tenant_id_from_agent,
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
        END IF;
      END LOOP;
    END;
  END IF;
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

