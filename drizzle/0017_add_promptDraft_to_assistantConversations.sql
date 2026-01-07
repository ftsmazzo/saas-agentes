-- Adicionar coluna promptDraft para armazenar o prompt em construção
-- Isso permite construção incremental do prompt durante a conversa

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assistantConversations' 
        AND column_name = 'promptDraft'
    ) THEN
        ALTER TABLE "assistantConversations" 
        ADD COLUMN "promptDraft" TEXT;
        
        -- Inicializar prompts existentes como vazios (serão construídos na próxima interação)
        UPDATE "assistantConversations" 
        SET "promptDraft" = NULL 
        WHERE "promptDraft" IS NULL;
    END IF;
END $$;

