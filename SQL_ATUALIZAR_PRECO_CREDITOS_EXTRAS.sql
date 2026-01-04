-- ============================================
-- ATUALIZAR PREÇO DE CRÉDITOS EXTRAS
-- Ajuste: R$ 60,00 por 1.000 créditos (R$ 0,06 por crédito)
-- ============================================

-- Atualizar preço de créditos extras
INSERT INTO "creditConfig" ("configKey", "configValue", "description", "updatedAt")
VALUES ('extraCreditsPricePer1000', '60.00', 'Preço em R$ por 1.000 créditos extras (R$ 0,06 por crédito)', NOW())
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
-- - 1 crédito = R$ 0,06
-- - 1.000 créditos = R$ 60,00
-- - 5.000 créditos = R$ 300,00
-- - 10.000 créditos = R$ 600,00
-- ============================================

