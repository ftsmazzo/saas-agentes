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

