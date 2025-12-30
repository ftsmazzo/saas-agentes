-- Adicionar novo valor ao enum eventType para suportar desativação de agente
-- Execute este script no PostgreSQL para adicionar o novo tipo de evento

-- Verificar se o valor já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'agent_deactivated' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'eventType')
    ) THEN
        ALTER TYPE eventType ADD VALUE 'agent_deactivated';
        RAISE NOTICE 'Valor agent_deactivated adicionado ao enum eventType';
    ELSE
        RAISE NOTICE 'Valor agent_deactivated já existe no enum eventType';
    END IF;
END $$;

