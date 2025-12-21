-- ============================================
-- SQL para ADICIONAR tenant_id em tabelas EXISTENTES do Workflow N8N
-- Execute este SQL no seu PostgreSQL (Supabase)
-- IMPORTANTE: Este script funciona com tabelas que JÁ EXISTEM
-- ============================================

-- Adicionar tenant_id nas tabelas existentes (ignora erro se já existir)
DO $$ 
BEGIN
  -- Adicionar tenant_id em chats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chats' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN tenant_id INT;
  END IF;
  
  -- Adicionar tenant_id em chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN tenant_id INT;
  END IF;
  
  -- Adicionar tenant_id em dados_cliente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dados_cliente' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE dados_cliente ADD COLUMN tenant_id INT;
  END IF;
END $$;

-- Criar tabela n8n_chat_histories se não existir
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance (só cria se tenant_id existir)
CREATE INDEX IF NOT EXISTS idx_chats_tenant_phone ON chats(tenant_id, phone) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_phone ON chat_messages(tenant_id, phone) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dados_cliente_tenant_telefone ON dados_cliente(tenant_id, telefone) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_tenant_session ON n8n_chat_histories(tenant_id, session_id);

-- ============================================
-- IMPORTANTE: 
-- 1. Execute este SQL no seu PostgreSQL (Supabase Dashboard → SQL Editor)
-- 2. No EasyPanel, mude DATABASE_URL de mysql:// para postgresql://
-- 3. Faça redeploy no EasyPanel
-- ============================================

