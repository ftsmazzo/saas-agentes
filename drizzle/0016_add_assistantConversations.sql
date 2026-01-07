-- Migration: Adicionar tabela assistantConversations
-- Data: 2026-01-07
-- Descrição: Tabela para armazenar conversas do assistente de configuração

CREATE TABLE IF NOT EXISTS "assistantConversations" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "agentId" INTEGER,
  "conversationId" VARCHAR(255) NOT NULL UNIQUE,
  messages JSONB NOT NULL,
  "collectedInfo" JSONB,
  "isComplete" BOOLEAN DEFAULT false,
  "promptGenerated" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "completedAt" TIMESTAMPTZ
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS "idx_assistantConversations_tenantId" ON "assistantConversations"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_assistantConversations_agentId" ON "assistantConversations"("agentId");
CREATE INDEX IF NOT EXISTS "idx_assistantConversations_conversationId" ON "assistantConversations"("conversationId");

