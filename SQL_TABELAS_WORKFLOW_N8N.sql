-- ============================================
-- SQL para criar tabelas do Workflow N8N no PostgreSQL
-- Execute este SQL no seu PostgreSQL (Supabase)
-- ============================================

-- Tabela de chats (com tenant_id para multi-tenant)
CREATE TABLE IF NOT EXISTS chats (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  etapa_followup NUMERIC
);

-- Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  phone TEXT NOT NULL,
  nomewpp TEXT,
  bot_message TEXT,
  user_message TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de dados do cliente
CREATE TABLE IF NOT EXISTS dados_cliente (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  telefone TEXT NOT NULL,
  nomewpp TEXT,
  atendimento_ia TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de conversas (para memória do agente)
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar tenant_id em tabelas existentes (se não existir)
DO $$ 
BEGIN
  -- Adicionar tenant_id em chats se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chats' AND column_name = 'tenant_id') THEN
    ALTER TABLE chats ADD COLUMN tenant_id INT;
  END IF;
  
  -- Adicionar tenant_id em chat_messages se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_messages' AND column_name = 'tenant_id') THEN
    ALTER TABLE chat_messages ADD COLUMN tenant_id INT;
  END IF;
  
  -- Adicionar tenant_id em dados_cliente se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dados_cliente' AND column_name = 'tenant_id') THEN
    ALTER TABLE dados_cliente ADD COLUMN tenant_id INT;
  END IF;
END $$;

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

