-- Migration: Adicionar coluna promptDraft à tabela assistantConversations
-- Execute este SQL diretamente no PostgreSQL

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assistantConversations' 
        AND column_name = 'promptDraft'
    ) THEN
        ALTER TABLE "assistantConversations" 
        ADD COLUMN "promptDraft" TEXT;
        
        RAISE NOTICE 'Coluna promptDraft adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna promptDraft já existe.';
    END IF;
END $$;

