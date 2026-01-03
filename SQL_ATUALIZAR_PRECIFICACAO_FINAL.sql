-- ============================================
-- ATUALIZAR PRECIFICAÇÃO FINAL
-- Baseado nas respostas do usuário:
-- - Margem: 200% (markup 3.0x)
-- - Uso: 100 conversas × 12 mensagens = 1.200 mensagens/mês (plano médio)
-- - Modelo: GPT-4.1-mini ou GPT-4o-mini (~3-4 créditos por mensagem)
-- ============================================

-- 1. Atualizar créditos mensais e descrição dos planos
UPDATE plans 
SET 
  "monthlyCredits" = CASE 
    WHEN id = 1 THEN 3000   -- Plano Básico: 3k créditos (R$ 99,00)
    WHEN id = 2 THEN 5000   -- Plano Pro: 5k créditos (R$ 199,00)
    WHEN id = 3 THEN 15000  -- Plano Enterprise: 15k créditos (R$ 499,00)
    ELSE 3000
  END,
  "description" = CASE
    WHEN id = 1 THEN 'Ideal para começar. Atende em média 50 clientes por mês.'
    WHEN id = 2 THEN 'Para crescer. Atende em média 100 clientes por mês.'
    WHEN id = 3 THEN 'Recursos avançados. Atende em média 300 clientes por mês.'
    ELSE "description"
  END,
  "updatedAt" = NOW()
WHERE id IN (1, 2, 3);

-- 2. Atualizar configuração de créditos (markup 200% = 3.0x)
-- creditValueUSD: $0.002 (mantém)
-- markupMultiplier: 3.0 (200% de margem)

-- Atualizar ou inserir creditValueUSD
INSERT INTO "creditConfig" ("configKey", "configValue", "description", "updatedAt")
VALUES ('creditValueUSD', '0.002', 'Valor em USD de 1 crédito', NOW())
ON CONFLICT ("configKey") 
DO UPDATE SET 
  "configValue" = EXCLUDED."configValue",
  "updatedAt" = NOW();

-- Atualizar ou inserir markupMultiplier (200% = 3.0x)
INSERT INTO "creditConfig" ("configKey", "configValue", "description", "updatedAt")
VALUES ('markupMultiplier', '3.0', 'Multiplicador de margem (3.0 = 200% de margem)', NOW())
ON CONFLICT ("configKey") 
DO UPDATE SET 
  "configValue" = EXCLUDED."configValue",
  "updatedAt" = NOW();

-- Atualizar ou inserir minCreditsPerTransaction
INSERT INTO "creditConfig" ("configKey", "configValue", "description", "updatedAt")
VALUES ('minCreditsPerTransaction', '1', 'Mínimo de créditos por transação', NOW())
ON CONFLICT ("configKey") 
DO UPDATE SET 
  "configValue" = EXCLUDED."configValue",
  "updatedAt" = NOW();

-- 3. Configuração de créditos extras (compra adicional)
-- Preço: R$ 0,050 por 1.000 créditos (50% mais caro que créditos do plano)
INSERT INTO "creditConfig" ("configKey", "configValue", "description", "updatedAt")
VALUES ('extraCreditsPricePer1000', '0.050', 'Preço em R$ por 1.000 créditos extras', NOW())
ON CONFLICT ("configKey") 
DO UPDATE SET 
  "configValue" = EXCLUDED."configValue",
  "updatedAt" = NOW();

-- 4. Verificar planos atualizados
SELECT 
  id, 
  name, 
  "description",
  "priceMonthly" / 100.0 as preco_reais,
  "monthlyCredits",
  ROUND(("monthlyCredits"::numeric / ("priceMonthly"::numeric / 100.0)), 2) as creditos_por_real,
  "maxWorkflowExecutions",
  "maxConversations",
  "maxStorageGB",
  "isActive"
FROM plans
ORDER BY id;

-- 5. Verificar configurações de créditos
SELECT 
  "configKey",
  "configValue",
  "description"
FROM "creditConfig"
WHERE "configKey" IN ('creditValueUSD', 'markupMultiplier', 'minCreditsPerTransaction', 'extraCreditsPricePer1000')
ORDER BY "configKey";

-- ============================================
-- NOTA: Valores finais
-- ============================================
-- Plano Básico (R$ 99,00): 3.000 créditos = 30,3 créditos/R$
--   Descrição: "Ideal para começar. Atende em média 50 clientes por mês."
-- 
-- Plano Pro (R$ 199,00): 5.000 créditos = 25,1 créditos/R$
--   Descrição: "Para crescer. Atende em média 100 clientes por mês."
-- 
-- Plano Enterprise (R$ 499,00): 15.000 créditos = 30,1 créditos/R$
--   Descrição: "Recursos avançados. Atende em média 300 clientes por mês."
-- 
-- Markup: 3.0x (200% de margem)
-- Créditos extras: R$ 0,050 por 1.000 créditos
-- ============================================

