-- Migration: Add chatwootAgentId column to tenants table
-- This column stores the ID of the Chatwoot agent (user) created for each tenant

ALTER TABLE "tenants" 
ADD COLUMN IF NOT EXISTS "chatwootAgentId" INTEGER;

-- Add comment
COMMENT ON COLUMN "tenants"."chatwootAgentId" IS 'ID do Agente (User) criado no Chatwoot para o tenant';

