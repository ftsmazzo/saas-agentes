-- ============================================
-- ADICIONAR FEATURES DIFERENCIADAS POR PLANO
-- ============================================
-- Este script adiciona campos para controlar features por plano
-- e atualiza as descrições com as funcionalidades
-- ============================================

-- 1. Adicionar colunas de features aos planos (se não existirem)
DO $$ 
BEGIN
  -- Feature: Agendamento (scheduling)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableScheduling') THEN
    ALTER TABLE plans ADD COLUMN "enableScheduling" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: RAG (Vector Search)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableRAG') THEN
    ALTER TABLE plans ADD COLUMN "enableRAG" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: Analytics Avançados (para Plano Pro)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableAdvancedAnalytics') THEN
    ALTER TABLE plans ADD COLUMN "enableAdvancedAnalytics" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: API Personalizada (para Plano Pro)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableCustomAPI') THEN
    ALTER TABLE plans ADD COLUMN "enableCustomAPI" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: Webhooks Personalizados (para Plano Pro)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableCustomWebhooks') THEN
    ALTER TABLE plans ADD COLUMN "enableCustomWebhooks" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: Suporte Prioritário (para Plano Pro)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enablePrioritySupport') THEN
    ALTER TABLE plans ADD COLUMN "enablePrioritySupport" BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Atualizar planos com features
UPDATE plans 
SET 
  -- Plano Básico (id=1): Agendamento
  "enableScheduling" = CASE WHEN id = 1 THEN true ELSE false END,
  "enableRAG" = CASE WHEN id = 3 THEN true ELSE false END, -- Enterprise
  "enableAdvancedAnalytics" = CASE WHEN id IN (2, 3) THEN true ELSE false END, -- Pro e Enterprise
  "enableCustomAPI" = CASE WHEN id IN (2, 3) THEN true ELSE false END, -- Pro e Enterprise
  "enableCustomWebhooks" = CASE WHEN id IN (2, 3) THEN true ELSE false END, -- Pro e Enterprise
  "enablePrioritySupport" = CASE WHEN id IN (2, 3) THEN true ELSE false END, -- Pro e Enterprise
  "updatedAt" = NOW()
WHERE id IN (1, 2, 3);

-- 3. Atualizar descrições com features
UPDATE plans 
SET 
  "description" = CASE
    WHEN id = 1 THEN 'Ideal para começar. Atende em média 50 clientes por mês. Inclui sistema de agendamento.'
    WHEN id = 2 THEN 'Para crescer. Atende em média 100 clientes por mês. Inclui analytics avançados, API personalizada e suporte prioritário.'
    WHEN id = 3 THEN 'Recursos avançados. Atende em média 300 clientes por mês. Inclui RAG (base de conhecimento), analytics avançados, API personalizada e suporte prioritário.'
    ELSE "description"
  END,
  "updatedAt" = NOW()
WHERE id IN (1, 2, 3);

-- 4. Verificar planos atualizados
SELECT 
  id, 
  name, 
  "description",
  "priceMonthly" / 100.0 as preco_reais,
  "monthlyCredits",
  "enableScheduling" as agendamento,
  "enableRAG" as rag,
  "enableAdvancedAnalytics" as analytics,
  "enableCustomAPI" as api_personalizada,
  "enableCustomWebhooks" as webhooks,
  "enablePrioritySupport" as suporte_prioritario,
  "isActive"
FROM plans
ORDER BY id;

-- ============================================
-- RESUMO DAS FEATURES POR PLANO
-- ============================================
-- Plano Básico (R$ 99,00):
--   ✅ Agendamento
--   ❌ RAG
--   ❌ Analytics Avançados
--   ❌ API Personalizada
--   ❌ Webhooks Personalizados
--   ❌ Suporte Prioritário
--
-- Plano Pro (R$ 199,00):
--   ❌ Agendamento
--   ❌ RAG
--   ✅ Analytics Avançados
--   ✅ API Personalizada
--   ✅ Webhooks Personalizados
--   ✅ Suporte Prioritário
--
-- Plano Enterprise (R$ 499,00):
--   ❌ Agendamento
--   ✅ RAG
--   ✅ Analytics Avançados
--   ✅ API Personalizada
--   ✅ Webhooks Personalizados
--   ✅ Suporte Prioritário
-- ============================================

