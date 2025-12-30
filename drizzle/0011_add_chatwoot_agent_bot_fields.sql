-- Migration: Add Chatwoot Agent Bot fields to tenants table
ALTER TABLE "tenants" ADD COLUMN "chatwootAgentBotId" integer;
ALTER TABLE "tenants" ADD COLUMN "chatwootAgentBotToken" text;

