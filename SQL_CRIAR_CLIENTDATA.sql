-- ============================================
-- CRIAR TABELA clientData (se não existir)
-- Execute este script no banco de dados principal
-- ============================================

-- Verificar se a tabela já existe antes de criar
DO $$ 
BEGIN
    -- Criar tabela clientData se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clientData'
    ) THEN
        CREATE TABLE "clientData" (
            id SERIAL PRIMARY KEY,
            "tenantId" INTEGER NOT NULL,
            phone TEXT NOT NULL,
            name TEXT,
            "aiService" TEXT,
            "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            
            -- Foreign key para tenants
            CONSTRAINT "clientData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
        );
        
        -- Criar índices para performance
        CREATE INDEX IF NOT EXISTS "clientData_tenantId_idx" ON "clientData"("tenantId");
        CREATE INDEX IF NOT EXISTS "clientData_phone_idx" ON "clientData"(phone);
        CREATE INDEX IF NOT EXISTS "clientData_tenantId_phone_idx" ON "clientData"("tenantId", phone);
        
        RAISE NOTICE '✅ Tabela clientData criada com sucesso!';
    ELSE
        RAISE NOTICE '⚠️ Tabela clientData já existe. Nenhuma alteração necessária.';
    END IF;
END $$;

-- Verificar se a tabela foi criada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clientData'
ORDER BY ordinal_position;

