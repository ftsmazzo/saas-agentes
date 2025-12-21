-- ============================================
-- SCRIPT PARA INSERIR PLANOS DO MYSQL NO POSTGRESQL
-- Dados extraídos do MySQL com IDs do Stripe corretos
-- Execute este script no seu PostgreSQL
-- ============================================

-- Primeiro, adicionar colunas se não existirem (para tabelas já criadas)
DO $$ 
BEGIN
  -- Adicionar maxWorkflowExecutions se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'maxWorkflowExecutions') THEN
    ALTER TABLE plans ADD COLUMN "maxWorkflowExecutions" INTEGER DEFAULT 1000;
  END IF;
  
  -- Adicionar maxConversations se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'maxConversations') THEN
    ALTER TABLE plans ADD COLUMN "maxConversations" INTEGER DEFAULT 10000;
  END IF;
  
  -- Adicionar maxStorageGB se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'maxStorageGB') THEN
    ALTER TABLE plans ADD COLUMN "maxStorageGB" INTEGER DEFAULT 5;
  END IF;
  
  -- Adicionar isActive se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'isActive') THEN
    ALTER TABLE plans ADD COLUMN "isActive" BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- Inserir planos com IDs e dados EXATOS do MySQL
INSERT INTO plans (id, name, description, "stripePriceId", "priceMonthly", "maxWorkflowExecutions", "maxConversations", "maxStorageGB", "isActive", "createdAt", "updatedAt")
VALUES
  (1, 'Plano Básico', 'Ideal para começar', 'price_1Scpmr33fEYo4xk98BmbUvni', 9900, 1000, 300, 5, true, '2025-12-10 13:52:10'::timestamptz, '2025-12-17 15:53:23'::timestamptz),
  (2, 'Plano Pro', 'Para crescer', 'price_1ScpnS33fEYo4xk9kKhhvQs2', 19900, 5000, 2000, 20, true, '2025-12-10 13:52:10'::timestamptz, '2025-12-10 16:01:24'::timestamptz),
  (3, 'Plano Enterprise', 'Recursos avançados', 'price_1Scpns33fEYo4xk9DCAgMKtl', 49900, NULL, NULL, NULL, true, '2025-12-10 13:52:10'::timestamptz, '2025-12-10 16:01:43'::timestamptz)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "stripePriceId" = EXCLUDED."stripePriceId",
  "priceMonthly" = EXCLUDED."priceMonthly",
  "maxWorkflowExecutions" = EXCLUDED."maxWorkflowExecutions",
  "maxConversations" = EXCLUDED."maxConversations",
  "maxStorageGB" = EXCLUDED."maxStorageGB",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = EXCLUDED."updatedAt";

-- Ajustar sequência do PostgreSQL para o próximo ID ser 4
SELECT setval('plans_id_seq', 3, true);

-- Verificar planos inseridos
SELECT 
  id, 
  name, 
  description, 
  "stripePriceId",
  "priceMonthly" / 100.0 as preco_reais,
  "maxWorkflowExecutions",
  "maxConversations",
  "maxStorageGB",
  "isActive"
FROM plans
ORDER BY id;

