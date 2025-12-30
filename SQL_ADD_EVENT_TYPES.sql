-- Adicionar novos valores ao enum eventType
-- Execute este SQL no banco PostgreSQL

-- Primeiro, verificar qual é o nome exato do enum
-- Execute: SELECT typname FROM pg_type WHERE typtype = 'e' AND typname LIKE '%event%';

-- Tentar sem aspas primeiro (mais comum)
DO $$ 
BEGIN
    -- Adicionar valores ao enum (sem IF NOT EXISTS, então pode dar erro se já existir)
    ALTER TYPE eventType ADD VALUE IF NOT EXISTS 'bulk_delete_all_clients';
    ALTER TYPE eventType ADD VALUE IF NOT EXISTS 'bulk_delete_test_clients';
    ALTER TYPE eventType ADD VALUE IF NOT EXISTS 'agent_activated';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Valores já existem no enum';
    WHEN undefined_object THEN
        -- Se não encontrar, tentar com aspas
        BEGIN
            ALTER TYPE "eventType" ADD VALUE IF NOT EXISTS 'bulk_delete_all_clients';
            ALTER TYPE "eventType" ADD VALUE IF NOT EXISTS 'bulk_delete_test_clients';
            ALTER TYPE "eventType" ADD VALUE IF NOT EXISTS 'agent_activated';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Valores já existem no enum';
        END;
END $$;

-- Verificar se foram adicionados
SELECT unnest(enum_range(NULL::eventType)) AS event_type;

