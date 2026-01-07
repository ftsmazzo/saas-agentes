-- Adicionar coluna extrasPurchased para rastrear créditos extras comprados separadamente
-- Isso permite preservar os extras no reset mensal

-- Adicionar coluna (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenantCredits' 
        AND column_name = 'extrasPurchased'
    ) THEN
        ALTER TABLE "tenantCredits" 
        ADD COLUMN "extrasPurchased" INTEGER DEFAULT 0;
        
        -- Inicializar com valores existentes: extras = totalPurchased - monthlyCredits (se positivo)
        -- Mas isso é complexo sem saber o monthlyCredits de cada tenant
        -- Então vamos inicializar como 0 e deixar o sistema calcular corretamente a partir de agora
        UPDATE "tenantCredits" 
        SET "extrasPurchased" = 0 
        WHERE "extrasPurchased" IS NULL;
    END IF;
END $$;

