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
CREATE TABLE IF NOT EXISTS "agentConfigs" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL UNIQUE,
  "systemPrompt" TEXT,
  "companyInfo" TEXT,
  "welcomeMessage" TEXT,
  "enableHumanHandoff" BOOLEAN DEFAULT true,
  "enableAudioTranscription" BOOLEAN DEFAULT true,
  "enableImageProcessing" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de métricas de uso
CREATE TABLE IF NOT EXISTS "usageMetrics" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "periodStart" TIMESTAMPTZ NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "workflowExecutions" INTEGER DEFAULT 0,
  "totalConversations" INTEGER DEFAULT 0,
  "totalMessages" INTEGER DEFAULT 0,
  "apiCallsOpenAI" INTEGER DEFAULT 0,
  "storageUsedMB" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de logs da plataforma
CREATE TABLE IF NOT EXISTS "platformLogs" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER,
  "eventType" eventType NOT NULL,
  severity severity DEFAULT 'info' NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS "system_config" (
  id SERIAL PRIMARY KEY,
  "configKey" VARCHAR(100) NOT NULL UNIQUE,
  "configValue" TEXT,
  "isEncrypted" BOOLEAN DEFAULT false NOT NULL,
  description TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "phoneNumber" VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(320),
  "isActive" BOOLEAN DEFAULT true,
  "lastInteraction" TIMESTAMPTZ,
  metadata TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "contactId" INTEGER NOT NULL,
  status conversationStatus DEFAULT 'active' NOT NULL,
  "aiPaused" BOOLEAN DEFAULT false,
  "startedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "lastMessageAt" TIMESTAMPTZ,
  "closedAt" TIMESTAMPTZ
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS "chatMessages" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "conversationId" INTEGER NOT NULL,
  "contactId" INTEGER NOT NULL,
  role messageRole NOT NULL,
  content TEXT NOT NULL,
  "mediaType" mediaType DEFAULT 'text',
  "mediaUrl" TEXT,
  metadata TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de tokens de ativação
CREATE TABLE IF NOT EXISTS "activationTokens" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL UNIQUE,
  token VARCHAR(255) NOT NULL UNIQUE,
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
CREATE INDEX IF NOT EXISTS idx_agent_configs_tenant ON "agentConfigs"("tenantId");
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant ON "usageMetrics"("tenantId");
CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant ON "platformLogs"("tenantId");
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone ON contacts("tenantId", "phoneNumber");
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations("tenantId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON "chatMessages"("tenantId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON "chatMessages"("conversationId");
CREATE INDEX IF NOT EXISTS idx_activation_tokens_token ON "activationTokens"(token);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_tenant ON "activationTokens"("tenantId");

-- ============================================
-- IMPORTANTE: 
-- 1. Execute este SQL no seu PostgreSQL PRINCIPAL
-- 2. As tabelas dos AGENTES (chats, chat_messages, dados_cliente) 
--    são criadas automaticamente pelo workflow N8N quando um agente é criado
-- 3. No EasyPanel, mude DATABASE_URL de mysql:// para postgresql://
-- 4. Faça redeploy no EasyPanel
-- 5. Execute criar-admin-postgresql.sql para criar o usuário admin
-- ============================================

