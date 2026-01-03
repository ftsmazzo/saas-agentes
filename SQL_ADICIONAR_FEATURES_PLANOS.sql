-- ============================================
-- ADICIONAR FEATURES DIFERENCIADAS POR PLANO
-- ============================================
-- Sistema progressivo: features do plano inferior vêm no superior
-- Plano 1: 1 agente, Agendamento, FAQ/Base de Conhecimento Simples
-- Plano 2: 2 agentes, tudo do plano 1 + Analytics, API, Webhooks, Suporte
-- Plano 3: 3+ agentes, tudo do plano 2 + RAG
-- ============================================

-- 1. Adicionar colunas de features aos planos (se não existirem)
DO $$ 
BEGIN
  -- Número máximo de agentes por plano
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'maxAgents') THEN
    ALTER TABLE plans ADD COLUMN "maxAgents" INTEGER DEFAULT 1;
  END IF;
  
  -- Feature: Agendamento (scheduling) - Plano 1+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableScheduling') THEN
    ALTER TABLE plans ADD COLUMN "enableScheduling" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: FAQ/Base de Conhecimento Simples (Perguntas e Respostas) - Plano 1+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableFAQ') THEN
    ALTER TABLE plans ADD COLUMN "enableFAQ" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: Analytics Avançados - Plano 2+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableAdvancedAnalytics') THEN
    ALTER TABLE plans ADD COLUMN "enableAdvancedAnalytics" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: API Personalizada - Plano 2+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableCustomAPI') THEN
    ALTER TABLE plans ADD COLUMN "enableCustomAPI" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: Webhooks Personalizados - Plano 2+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableCustomWebhooks') THEN
    ALTER TABLE plans ADD COLUMN "enableCustomWebhooks" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: Suporte Prioritário - Plano 2+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enablePrioritySupport') THEN
    ALTER TABLE plans ADD COLUMN "enablePrioritySupport" BOOLEAN DEFAULT false;
  END IF;
  
  -- Feature: RAG (Vector Search) - Plano 3+
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'plans' 
                 AND column_name = 'enableRAG') THEN
    ALTER TABLE plans ADD COLUMN "enableRAG" BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Atualizar planos com features (SISTEMA PROGRESSIVO)
UPDATE plans 
SET 
  -- Número máximo de agentes
  "maxAgents" = CASE 
    WHEN id = 1 THEN 1   -- Básico: 1 agente
    WHEN id = 2 THEN 2   -- Pro: 2 agentes
    WHEN id = 3 THEN 999 -- Enterprise: ilimitado (999 = ilimitado)
    ELSE 1
  END,
  
  -- Plano 1 (Básico): Agendamento + FAQ
  "enableScheduling" = CASE WHEN id >= 1 THEN true ELSE false END,
  "enableFAQ" = CASE WHEN id >= 1 THEN true ELSE false END,
  
  -- Plano 2+ (Pro e Enterprise): Analytics, API, Webhooks, Suporte
  "enableAdvancedAnalytics" = CASE WHEN id >= 2 THEN true ELSE false END,
  "enableCustomAPI" = CASE WHEN id >= 2 THEN true ELSE false END,
  "enableCustomWebhooks" = CASE WHEN id >= 2 THEN true ELSE false END,
  "enablePrioritySupport" = CASE WHEN id >= 2 THEN true ELSE false END,
  
  -- Plano 3+ (Enterprise): RAG
  "enableRAG" = CASE WHEN id >= 3 THEN true ELSE false END,
  
  "updatedAt" = NOW()
WHERE id IN (1, 2, 3);

-- 3. Atualizar descrições com features (progressivas)
UPDATE plans 
SET 
  "description" = CASE
    WHEN id = 1 THEN 'Ideal para começar. Atende em média 50 clientes por mês. 1 agente, agendamento e base de conhecimento (FAQ).'
    WHEN id = 2 THEN 'Para crescer. Atende em média 100 clientes por mês. 2 agentes, agendamento, FAQ, analytics avançados, API personalizada, webhooks e suporte prioritário.'
    WHEN id = 3 THEN 'Recursos avançados. Atende em média 300 clientes por mês. Agentes ilimitados, agendamento, FAQ, RAG (base de conhecimento avançada), analytics, API, webhooks e suporte prioritário.'
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
  "maxAgents" as max_agentes,
  "enableScheduling" as agendamento,
  "enableFAQ" as faq_base_conhecimento,
  "enableAdvancedAnalytics" as analytics,
  "enableCustomAPI" as api_personalizada,
  "enableCustomWebhooks" as webhooks,
  "enablePrioritySupport" as suporte_prioritario,
  "enableRAG" as rag,
  "isActive"
FROM plans
ORDER BY id;

-- ============================================
-- RESUMO DAS FEATURES POR PLANO (PROGRESSIVO)
-- ============================================
-- Plano Básico (R$ 99,00):
--   • 1 agente
--   • 3.000 créditos/mês
--   • ✅ Agendamento
--   • ✅ FAQ/Base de Conhecimento Simples
--   • ❌ Analytics Avançados
--   • ❌ API Personalizada
--   • ❌ Webhooks
--   • ❌ Suporte Prioritário
--   • ❌ RAG
--
-- Plano Pro (R$ 199,00):
--   • 2 agentes
--   • 5.000 créditos/mês
--   • ✅ Agendamento (herdado)
--   • ✅ FAQ/Base de Conhecimento (herdado)
--   • ✅ Analytics Avançados
--   • ✅ API Personalizada
--   • ✅ Webhooks Personalizados
--   • ✅ Suporte Prioritário
--   • ❌ RAG
--
-- Plano Enterprise (R$ 499,00):
--   • Agentes ilimitados (3+)
--   • 15.000 créditos/mês
--   • ✅ Agendamento (herdado)
--   • ✅ FAQ/Base de Conhecimento (herdado)
--   • ✅ Analytics Avançados (herdado)
--   • ✅ API Personalizada (herdado)
--   • ✅ Webhooks Personalizados (herdado)
--   • ✅ Suporte Prioritário (herdado)
--   • ✅ RAG (Base de Conhecimento Avançada)
-- ============================================

