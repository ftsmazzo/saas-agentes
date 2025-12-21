-- ============================================
-- MIGRATION: Adicionar campos de Tools/Agentes Especialistas
-- Execute este script no PostgreSQL após atualizar o schema
-- ============================================

-- Adicionar colunas para configuração de Tools, Agendamento e RAG
ALTER TABLE "agentConfigs" 
ADD COLUMN IF NOT EXISTS "toolsConfig" TEXT,
ADD COLUMN IF NOT EXISTS "schedulingConfig" TEXT,
ADD COLUMN IF NOT EXISTS "ragConfig" TEXT;

-- Comentários para documentação
COMMENT ON COLUMN "agentConfigs"."toolsConfig" IS 'JSON com configuração de tools/agentes especialistas ativos';
COMMENT ON COLUMN "agentConfigs"."schedulingConfig" IS 'JSON com configuração de agendamento';
COMMENT ON COLUMN "agentConfigs"."ragConfig" IS 'JSON com configuração de RAG/base de conhecimento';

-- ============================================
-- ESTRUTURA JSON ESPERADA:
-- ============================================
--
-- toolsConfig:
-- {
--   "enabledTools": ["agentSQL", "agentTerritorio", "buscaEndereco"],
--   "toolSettings": {}
-- }
--
-- schedulingConfig:
-- {
--   "enabled": true,
--   "settings": {
--     "businessHours": { "start": "09:00", "end": "18:00" },
--     "timezone": "America/Sao_Paulo",
--     "availableDays": ["monday", "tuesday", "wednesday", "thursday", "friday"]
--   }
-- }
--
-- ragConfig:
-- {
--   "enabled": true,
--   "kbId": "300001",
--   "apiUrl": "https://sistemarag.fabricadosdados.online/api/kb"
-- }
-- ============================================

