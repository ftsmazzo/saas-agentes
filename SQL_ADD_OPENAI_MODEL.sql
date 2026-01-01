-- ============================================
-- ADICIONAR CAMPO openaiModel NA TABELA agentConfigs
-- ============================================
-- Execute este script no seu banco PostgreSQL

-- Adicionar coluna openaiModel
ALTER TABLE "agentConfigs" 
ADD COLUMN IF NOT EXISTS "openaiModel" VARCHAR(50) DEFAULT 'gpt-4o-mini';

-- Atualizar registros existentes com valor padrão
UPDATE "agentConfigs" 
SET "openaiModel" = 'gpt-4o-mini' 
WHERE "openaiModel" IS NULL;

-- Adicionar comentário
COMMENT ON COLUMN "agentConfigs"."openaiModel" IS 'Modelo OpenAI usado pelo agente (gpt-4o, gpt-4o-mini, gpt-3.5-turbo, etc.)';

