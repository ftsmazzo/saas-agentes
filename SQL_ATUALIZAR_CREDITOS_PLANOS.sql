-- ============================================
-- ATUALIZAR CRÉDITOS MENSais NOS PLANOS
-- ============================================
-- Execute este script no seu PostgreSQL
-- ============================================

-- Verificar se a coluna monthlyCredits existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'monthlyCredits') THEN
    ALTER TABLE plans ADD COLUMN "monthlyCredits" INTEGER DEFAULT 10000;
    RAISE NOTICE 'Coluna monthlyCredits criada';
  ELSE
    RAISE NOTICE 'Coluna monthlyCredits já existe';
  END IF;
END $$;

-- Atualizar créditos mensais para cada plano
-- Ajuste os valores conforme sua estratégia de precificação
UPDATE plans 
SET "monthlyCredits" = CASE 
  WHEN id = 1 THEN 10000   -- Plano Básico: 10k créditos (R$ 99,00)
  WHEN id = 2 THEN 50000   -- Plano Pro: 50k créditos (R$ 199,00)
  WHEN id = 3 THEN 200000  -- Plano Enterprise: 200k créditos (R$ 499,00)
  ELSE 10000
END,
"updatedAt" = NOW()
WHERE id IN (1, 2, 3);

-- Verificar planos atualizados
SELECT 
  id, 
  name, 
  "priceMonthly" / 100.0 as preco_reais,
  "monthlyCredits",
  "maxWorkflowExecutions",
  "maxConversations",
  "maxStorageGB",
  "isActive"
FROM plans
ORDER BY id;

-- ============================================
-- NOTA: Valores sugeridos
-- ============================================
-- Plano Básico (R$ 99,00): 10.000 créditos = ~101 créditos/R$
-- Plano Pro (R$ 199,00): 50.000 créditos = ~251 créditos/R$
-- Plano Enterprise (R$ 499,00): 200.000 créditos = ~401 créditos/R$
-- 
-- Ajuste conforme sua estratégia de precificação!
-- ============================================

