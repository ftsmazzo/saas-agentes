-- ============================================
-- SCRIPT DE MIGRAÇÃO DE DADOS
-- ============================================
-- Execute este script DEPOIS de executar migrate-database.sql
-- 
-- Este script migra agentConfigs existentes para agents + agentConfigs
-- ============================================

-- NOTA: Não usamos BEGIN/COMMIT aqui para evitar problemas de transação
-- Cada bloco DO $$ tem seu próprio tratamento de erro

-- ============================================
-- PASSO 1: Migrar agentConfigs para agents
-- ============================================

DO $$ 
BEGIN
    -- Para cada agentConfig existente, criar um agent correspondente
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
    WHERE ac."agentId" IS NULL  -- Apenas configs que ainda não foram migrados
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'PASSO 1: Agents criados com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PASSO 1: Erro (pode ser que já existam): %', SQLERRM;
END $$;

-- ============================================
-- PASSO 2: Atualizar agentConfigs para referenciar agents
-- ============================================

DO $$ 
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE "agentConfigs" ac
    SET "agentId" = a.id
    FROM "agents" a
    WHERE ac."tenantId" = a."tenantId"
      AND ac."agentId" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "agentConfigs" ac2 
        WHERE ac2."agentId" = a.id
      );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'PASSO 2: % agentConfigs atualizados', updated_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PASSO 2: Erro: %', SQLERRM;
END $$;

-- ============================================
-- PASSO 3: Limpar duplicatas e adicionar constraint unique de agentId
-- ============================================

DO $$ 
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Primeiro, garantir que não há duplicatas
    DELETE FROM "agentConfigs" ac1
    USING "agentConfigs" ac2
    WHERE ac1."agentId" = ac2."agentId"
      AND ac1.id < ac2.id
      AND ac1."agentId" IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
        RAISE NOTICE 'PASSO 3: % duplicatas removidas', deleted_count;
    END IF;
    
    -- Agora adicionar constraint unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agentConfigs_agentId_key'
    ) THEN
        ALTER TABLE "agentConfigs" 
        ADD CONSTRAINT "agentConfigs_agentId_key" 
        UNIQUE ("agentId");
        RAISE NOTICE 'PASSO 3: Constraint unique de agentId adicionada';
    ELSE
        RAISE NOTICE 'PASSO 3: Constraint unique de agentId já existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PASSO 3: Erro: %', SQLERRM;
END $$;

-- ============================================
-- PASSO 4: Tornar agentId NOT NULL (opcional - pode fazer depois)
-- ============================================
-- Descomente se quiser tornar agentId obrigatório
-- ALTER TABLE "agentConfigs" ALTER COLUMN "agentId" SET NOT NULL;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
DO $$ 
DECLARE
    agents_count INTEGER;
    configs_count INTEGER;
    configs_with_agent INTEGER;
    configs_without_agent INTEGER;
BEGIN
    SELECT COUNT(*) INTO agents_count FROM "agents";
    SELECT COUNT(*) INTO configs_count FROM "agentConfigs";
    SELECT COUNT(*) INTO configs_with_agent FROM "agentConfigs" WHERE "agentId" IS NOT NULL;
    SELECT COUNT(*) INTO configs_without_agent FROM "agentConfigs" WHERE "agentId" IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migração de dados concluída!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Agents criados: %', agents_count;
    RAISE NOTICE 'AgentConfigs totais: %', configs_count;
    RAISE NOTICE 'AgentConfigs com agentId: %', configs_with_agent;
    IF configs_without_agent > 0 THEN
        RAISE WARNING 'AgentConfigs SEM agentId: % (precisa verificar)', configs_without_agent;
    END IF;
    RAISE NOTICE '========================================';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na verificação: %', SQLERRM;
END $$;

