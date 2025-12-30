-- ============================================
-- Adicionar campos para Agent Bot do Chatwoot
-- ============================================
-- Execute este script no banco de dados PostgreSQL para adicionar
-- os campos necessários para armazenar ID e Token do Agent Bot

-- Verificar se os campos já existem antes de adicionar
DO $$ 
BEGIN
    -- Adicionar campo chatwootAgentBotId se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'chatwootAgentBotId'
    ) THEN
        ALTER TABLE tenants ADD COLUMN "chatwootAgentBotId" INTEGER;
        RAISE NOTICE 'Campo chatwootAgentBotId adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo chatwootAgentBotId já existe';
    END IF;

    -- Adicionar campo chatwootAgentBotToken se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'chatwootAgentBotToken'
    ) THEN
        ALTER TABLE tenants ADD COLUMN "chatwootAgentBotToken" TEXT;
        RAISE NOTICE 'Campo chatwootAgentBotToken adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Campo chatwootAgentBotToken já existe';
    END IF;
END $$;

-- Verificar se os campos foram criados
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('chatwootAgentBotId', 'chatwootAgentBotToken')
ORDER BY column_name;

