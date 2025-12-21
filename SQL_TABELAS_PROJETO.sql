-- ============================================
-- SQL para criar TABELAS DO PROJETO (SaaS Multi-tenant)
-- Execute este SQL no seu PostgreSQL PRINCIPAL
-- ============================================
-- IMPORTANTE: As tabelas dos AGENTES (chats, chat_messages, etc) 
-- são criadas automaticamente pelo workflow N8N quando um agente é criado
-- ============================================

-- Enums
CREATE TYPE role AS ENUM ('user', 'admin');
CREATE TYPE status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE subscriptionStatus AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'trialing');
CREATE TYPE eventType AS ENUM (
  'tenant_created',
  'tenant_activated',
  'tenant_suspended',
  'tenant_deleted',
  'payment_success',
  'payment_failed',
  'usage_limit_reached',
  'workflow_provisioned',
  'workflow_failed',
  'db_provisioned',
  'db_failed',
  'evolution_provisioned',
  'evolution_failed',
  'config_updated',
  'provisioning_failed',
  'n8n_failed',
  'email_failed'
);
CREATE TYPE severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE conversationStatus AS ENUM ('active', 'paused', 'closed');
CREATE TYPE messageRole AS ENUM ('user', 'assistant', 'system');
CREATE TYPE mediaType AS ENUM ('text', 'audio', 'image', 'document');

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  "passwordHash" TEXT,
  role role DEFAULT 'user' NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de tenants (clientes)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  "ownerId" INTEGER NOT NULL,
  "companyName" VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  subdomain VARCHAR(100) UNIQUE,
  status status DEFAULT 'active' NOT NULL,
  "passwordHash" TEXT,
  "isActivated" BOOLEAN DEFAULT false NOT NULL,
  "n8nWorkflowId" VARCHAR(100),
  "evolutionInstanceName" VARCHAR(100),
  "evolutionApiKey" TEXT,
  "chatwootInboxId" INTEGER,
  "dbHost" VARCHAR(255),
  "dbPort" INTEGER,
  "dbName" VARCHAR(100),
  "dbUser" VARCHAR(100),
  "dbPassword" TEXT,
  "stripeCustomerId" VARCHAR(100),
  "stripeSubscriptionId" VARCHAR(100),
  "subscriptionStatus" subscriptionStatus,
  "currentPlanId" INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de planos
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "stripePriceId" VARCHAR(100) NOT NULL,
  "priceMonthly" INTEGER NOT NULL,
  "maxTenants" INTEGER,
  "maxAgents" INTEGER,
  "maxMessagesPerMonth" INTEGER,
  "features" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de configurações de agente
CREATE TABLE IF NOT EXISTS agent_configs (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "companyInfo" JSONB,
  "welcomeMessage" TEXT,
  "enableAudioTranscription" BOOLEAN DEFAULT false NOT NULL,
  "enableAudioResponse" BOOLEAN DEFAULT false NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de métricas de uso
CREATE TABLE IF NOT EXISTS usage_metrics (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "metricType" VARCHAR(50) NOT NULL,
  value INTEGER NOT NULL,
  "recordedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de logs da plataforma
CREATE TABLE IF NOT EXISTS platform_logs (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER,
  "eventType" eventType NOT NULL,
  severity severity NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name TEXT,
  email VARCHAR(320),
  metadata JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "contactId" INTEGER,
  phone VARCHAR(20) NOT NULL,
  status conversationStatus DEFAULT 'active' NOT NULL,
  "lastMessageAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "conversationId" INTEGER,
  role messageRole NOT NULL,
  content TEXT NOT NULL,
  "mediaType" mediaType DEFAULT 'text' NOT NULL,
  "mediaUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de tokens de ativação
CREATE TABLE IF NOT EXISTS activation_tokens (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_openid ON users("openId");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants("ownerId");
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_agent_configs_tenant ON agent_configs("tenantId");
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant ON usage_metrics("tenantId");
CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant ON platform_logs("tenantId");
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone ON contacts("tenantId", phone);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations("tenantId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages("tenantId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_activation_tokens_token ON activation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_tenant ON activation_tokens("tenantId");

-- ============================================
-- IMPORTANTE: 
-- 1. Execute este SQL no seu PostgreSQL PRINCIPAL
-- 2. As tabelas dos AGENTES (chats, chat_messages, dados_cliente) 
--    são criadas automaticamente pelo workflow N8N quando um agente é criado
-- 3. No EasyPanel, mude DATABASE_URL de mysql:// para postgresql://
-- 4. Faça redeploy no EasyPanel
-- ============================================

