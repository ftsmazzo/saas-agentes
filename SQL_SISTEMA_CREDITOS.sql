-- ============================================
-- SISTEMA DE CRÉDITOS E CONTROLE DE CONSUMO
-- ============================================

-- 1. Adicionar campo monthlyCredits na tabela plans
ALTER TABLE "plans" 
ADD COLUMN IF NOT EXISTS "monthlyCredits" INTEGER DEFAULT 10000;

-- 2. Expandir usageMetrics com campos de tokens e custos
ALTER TABLE "usageMetrics"
ADD COLUMN IF NOT EXISTS "tokensChat" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tokensAudio" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tokensImage" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tokensFormat" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "costChatUSD" DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "costAudioUSD" DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "costImageUSD" DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "costFormatUSD" DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalCostUSD" DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalCreditsUsed" INTEGER DEFAULT 0;

-- 3. Criar tabela de transações detalhadas de uso
CREATE TABLE IF NOT EXISTS "usageTransactions" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "operation" VARCHAR(20) NOT NULL, -- 'chat', 'audio', 'image', 'format', 'pdf'
  "model" VARCHAR(50) NOT NULL,
  "tokensInput" INTEGER DEFAULT 0,
  "tokensOutput" INTEGER DEFAULT 0,
  "totalTokens" INTEGER DEFAULT 0,
  "costUSD" DECIMAL(10, 6) DEFAULT 0,
  "creditsUsed" INTEGER DEFAULT 0,
  "metadata" TEXT, -- JSON com detalhes
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_transactions_tenant ON "usageTransactions"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_usage_transactions_operation ON "usageTransactions"("operation");

-- 4. Criar tabela de saldo de créditos por tenant
CREATE TABLE IF NOT EXISTS "tenantCredits" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL UNIQUE,
  "currentCredits" INTEGER DEFAULT 0,
  "totalCreditsPurchased" INTEGER DEFAULT 0,
  "totalCreditsUsed" INTEGER DEFAULT 0,
  "totalCreditsBonus" INTEGER DEFAULT 0,
  "lastResetDate" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_credits_tenant ON "tenantCredits"("tenantId");

-- 5. Criar tabela de preços OpenAI (parametrizável)
CREATE TABLE IF NOT EXISTS "openaiPricing" (
  id SERIAL PRIMARY KEY,
  "model" VARCHAR(50) NOT NULL UNIQUE,
  "priceInputPer1M" DECIMAL(10, 4), -- USD por 1M tokens input
  "priceOutputPer1M" DECIMAL(10, 4), -- USD por 1M tokens output
  "pricePerMinute" DECIMAL(10, 4), -- Para Whisper (por minuto)
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Inserir preços iniciais dos modelos OpenAI (USD por 1M tokens)
INSERT INTO "openaiPricing" ("model", "priceInputPer1M", "priceOutputPer1M", "pricePerMinute", "isActive") VALUES
  ('gpt-4o', 2.50, 10.00, NULL, true),
  ('gpt-4.1', 2.50, 10.00, NULL, true),
  ('gpt-4.1-mini', 0.20, 0.80, NULL, true),
  ('gpt-4o-mini', 0.15, 0.60, NULL, true),
  ('gpt-5', 2.50, 10.00, NULL, true),
  ('gpt-5-mini', 0.20, 0.80, NULL, true),
  ('gpt-5.2', 2.50, 10.00, NULL, true),
  ('gpt-4-turbo', 10.00, 30.00, NULL, true),
  ('gpt-3.5-turbo', 0.50, 1.50, NULL, true),
  ('o1-preview', 15.00, 60.00, NULL, true),
  ('o1-mini', 3.00, 12.00, NULL, true),
  ('gpt-4o-vision', 2.50, 10.00, NULL, true),
  ('whisper-1', NULL, NULL, 0.006, true) -- Preço por minuto de áudio
ON CONFLICT ("model") DO UPDATE SET
  "priceInputPer1M" = EXCLUDED."priceInputPer1M",
  "priceOutputPer1M" = EXCLUDED."priceOutputPer1M",
  "pricePerMinute" = EXCLUDED."pricePerMinute",
  "updatedAt" = NOW();

-- 7. Criar tabela de configuração de créditos (parametrizável)
CREATE TABLE IF NOT EXISTS "creditConfig" (
  id SERIAL PRIMARY KEY,
  "configKey" VARCHAR(100) NOT NULL UNIQUE,
  "configValue" TEXT NOT NULL, -- JSON
  "description" TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Inserir configuração padrão de conversão de créditos
-- Exemplo: 1 crédito = $0.002 USD (ou seja, $1 USD = 500 créditos)
-- Isso permite margem de lucro: se custo real é $0.10, cobramos 50 créditos (equivalente a $0.10)
INSERT INTO "creditConfig" ("configKey", "configValue", "description") VALUES
  ('creditValueUSD', '0.002', 'Valor de 1 crédito em USD. Ex: 0.002 = $0.002 USD por crédito'),
  ('markupMultiplier', '1.5', 'Multiplicador de margem de lucro (1.5 = 50% de margem)'),
  ('minCreditsPerTransaction', '1', 'Mínimo de créditos por transação'),
  ('autoResetMonthly', 'true', 'Reset automático de créditos mensais')
ON CONFLICT ("configKey") DO UPDATE SET
  "configValue" = EXCLUDED."configValue",
  "updatedAt" = NOW();

-- 9. Inicializar créditos para tenants existentes (se necessário)
-- Isso pode ser feito via script separado ou na primeira execução

