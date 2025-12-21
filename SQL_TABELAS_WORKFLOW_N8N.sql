-- ============================================
-- SQL para ADICIONAR tenant_id em tabelas EXISTENTES do Workflow N8N
-- Execute este SQL no seu PostgreSQL (Supabase)
-- ============================================

-- PRIMEIRO: Adicionar tenant_id nas tabelas existentes (se não existir)
-- Isso funciona mesmo se as tabelas já existirem sem tenant_id

-- Adicionar tenant_id em chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS tenant_id INT;

-- Adicionar tenant_id em chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tenant_id INT;

-- Adicionar tenant_id em dados_cliente
ALTER TABLE dados_cliente ADD COLUMN IF NOT EXISTS tenant_id INT;

-- Criar tabela n8n_chat_histories se não existir
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chats_tenant_phone ON chats(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_phone ON chat_messages(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_dados_cliente_tenant_telefone ON dados_cliente(tenant_id, telefone);
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_tenant_session ON n8n_chat_histories(tenant_id, session_id);

-- ============================================
-- IMPORTANTE: 
-- 1. Execute este SQL no seu PostgreSQL (Supabase Dashboard → SQL Editor)
-- 2. No EasyPanel, mude DATABASE_URL de mysql:// para postgresql://
-- 3. Faça redeploy no EasyPanel
-- ============================================

