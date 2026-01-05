-- ============================================
-- SCRIPT DE MIGRAÇÃO: Refatoração para Múltiplos Agentes
-- ============================================
-- Execute este script no PgAdmin ou via psql
-- 
-- IMPORTANTE: Faça backup antes de executar!
-- 
-- Este script:
-- 1. Cria enum agentStatus
-- 2. Cria tabela agents
-- 3. Modifica agentConfigs (remove unique de tenantId, adiciona agentId)
-- 4. Adiciona agentId em tabelas relacionadas
-- 5. Remove campos obsoletos de tenants
-- ============================================

BEGIN;

-- ============================================
-- PASSO 1: Criar Enum agentStatus
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agentStatus') THEN
        CREATE TYPE "agentStatus" AS ENUM ('active', 'paused', 'deleted');
        RAISE NOTICE 'Enum agentStatus criado com sucesso';
    ELSE
        RAISE NOTICE 'Enum agentStatus já existe';
    END IF;
END $$;

-- ============================================
-- PASSO 2: Criar Tabela agents
-- ============================================
CREATE TABLE IF NOT EXISTS "agents" (
  "id" SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" "agentStatus" DEFAULT 'active' NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  
  -- Integrações específicas do agente
  "n8nWorkflowId" VARCHAR(100),
  "evolutionInstanceName" VARCHAR(100),
  "evolutionApiKey" TEXT,
  "chatwootInboxId" INTEGER,
  
  -- Metadados
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices
  CONSTRAINT "agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_agents_tenantId" ON "agents"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_agents_status" ON "agents"("status");

-- ============================================
-- PASSO 3: Modificar agentConfigs
-- ============================================

-- 3.1: Adicionar coluna agentId (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agentConfigs' AND column_name = 'agentId'
    ) THEN
        ALTER TABLE "agentConfigs" ADD COLUMN "agentId" INTEGER;
        RAISE NOTICE 'Coluna agentId adicionada em agentConfigs';
    ELSE
        RAISE NOTICE 'Coluna agentId já existe em agentConfigs';
    END IF;
END $$;

-- 3.2: Remover constraint unique de tenantId (se existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agentConfigs_tenantId_key'
    ) THEN
        ALTER TABLE "agentConfigs" DROP CONSTRAINT "agentConfigs_tenantId_key";
        RAISE NOTICE 'Constraint unique de tenantId removida';
    ELSE
        RAISE NOTICE 'Constraint unique de tenantId não existe';
    END IF;
END $$;

-- 3.3: Adicionar constraint unique de agentId (depois de migrar dados)
-- Vamos fazer isso depois da migração de dados

-- 3.4: Adicionar foreign key de agentId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agentConfigs_agentId_fkey'
    ) THEN
        ALTER TABLE "agentConfigs" 
        ADD CONSTRAINT "agentConfigs_agentId_fkey" 
        FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key agentId adicionada';
    ELSE
        RAISE NOTICE 'Foreign key agentId já existe';
    END IF;
END $$;

-- ============================================
-- PASSO 4: Adicionar agentId em tabelas relacionadas
-- ============================================

-- 4.1: conversations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'agentId'
    ) THEN
        ALTER TABLE "conversations" ADD COLUMN "agentId" INTEGER;
        RAISE NOTICE 'Coluna agentId adicionada em conversations';
    ELSE
        RAISE NOTICE 'Coluna agentId já existe em conversations';
    END IF;
END $$;

-- 4.2: chatMessages
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatMessages' AND column_name = 'agentId'
    ) THEN
        ALTER TABLE "chatMessages" ADD COLUMN "agentId" INTEGER;
        RAISE NOTICE 'Coluna agentId adicionada em chatMessages';
    ELSE
        RAISE NOTICE 'Coluna agentId já existe em chatMessages';
    END IF;
END $$;

-- 4.3: usageTransactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usageTransactions' AND column_name = 'agentId'
    ) THEN
        ALTER TABLE "usageTransactions" ADD COLUMN "agentId" INTEGER;
        RAISE NOTICE 'Coluna agentId adicionada em usageTransactions';
    ELSE
        RAISE NOTICE 'Coluna agentId já existe em usageTransactions';
    END IF;
END $$;

-- ============================================
-- PASSO 5: Remover campos obsoletos de tenants
-- ============================================

-- 5.1: Remover campos de DB (se existirem)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'dbHost') THEN
        ALTER TABLE "tenants" DROP COLUMN "dbHost";
        RAISE NOTICE 'Coluna dbHost removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'dbPort') THEN
        ALTER TABLE "tenants" DROP COLUMN "dbPort";
        RAISE NOTICE 'Coluna dbPort removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'dbName') THEN
        ALTER TABLE "tenants" DROP COLUMN "dbName";
        RAISE NOTICE 'Coluna dbName removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'dbUser') THEN
        ALTER TABLE "tenants" DROP COLUMN "dbUser";
        RAISE NOTICE 'Coluna dbUser removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'dbPassword') THEN
        ALTER TABLE "tenants" DROP COLUMN "dbPassword";
        RAISE NOTICE 'Coluna dbPassword removida';
    END IF;
END $$;

-- 5.2: Remover campos de integração (movidos para agents)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'n8nWorkflowId') THEN
        ALTER TABLE "tenants" DROP COLUMN "n8nWorkflowId";
        RAISE NOTICE 'Coluna n8nWorkflowId removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'evolutionInstanceName') THEN
        ALTER TABLE "tenants" DROP COLUMN "evolutionInstanceName";
        RAISE NOTICE 'Coluna evolutionInstanceName removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'evolutionApiKey') THEN
        ALTER TABLE "tenants" DROP COLUMN "evolutionApiKey";
        RAISE NOTICE 'Coluna evolutionApiKey removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'chatwootInboxId') THEN
        ALTER TABLE "tenants" DROP COLUMN "chatwootInboxId";
        RAISE NOTICE 'Coluna chatwootInboxId removida';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migração do schema concluída!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Próximo passo: Execute o script de migração de dados';
    RAISE NOTICE 'Arquivo: scripts/migrate-to-agents.ts';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- NOTA: Após executar este script, execute:
-- tsx scripts/migrate-to-agents.ts
-- ============================================

