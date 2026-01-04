-- ============================================
-- ATUALIZAR PREÇO DE CRÉDITOS EXTRAS
-- Ajuste: R$ 0,10 por 1.000 créditos
-- (Garante mínimo de R$ 0,50 para 5.000 créditos - mínimo do Stripe)
-- ============================================

-- Atualizar preço de créditos extras
INSERT INTO "creditConfig" ("configKey", "configValue", "description", "updatedAt")
VALUES ('extraCreditsPricePer1000', '0.10', 'Preço em R$ por 1.000 créditos extras (mínimo R$ 0,50 para 5.000 créditos)', NOW())
ON CONFLICT ("configKey") 
DO UPDATE SET 
  "configValue" = EXCLUDED."configValue",
  "description" = EXCLUDED."description",
  "updatedAt" = NOW();

-- Verificar atualização
SELECT 
  "configKey",
  "configValue",
  "description",
  "updatedAt"
FROM "creditConfig"
WHERE "configKey" = 'extraCreditsPricePer1000';

-- ============================================
-- NOTA: 
-- - 1.000 créditos = R$ 0,10
-- - 5.000 créditos = R$ 0,50 (mínimo do Stripe)
-- - 10.000 créditos = R$ 1,00
-- ============================================

