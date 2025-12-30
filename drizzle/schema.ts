import { pgTable, pgEnum, text, timestamp, varchar, boolean, integer, serial } from "drizzle-orm/pg-core";

/**
 * Enums do PostgreSQL
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["active", "suspended", "deleted"]);
export const subscriptionStatusEnum = pgEnum("subscriptionStatus", ["active", "past_due", "canceled", "incomplete", "trialing"]);
export const eventTypeEnum = pgEnum("eventType", [
  "tenant_created",
  "tenant_activated",
  "tenant_suspended",
  "tenant_deleted",
  "payment_success",
  "payment_failed",
  "usage_limit_reached",
  "workflow_provisioned",
  "workflow_failed",
  "db_provisioned",
  "db_failed",
  "evolution_provisioned",
  "evolution_failed",
  "config_updated",
  "provisioning_failed",
  "n8n_failed",
  "email_failed",
  "bulk_delete_all_clients",
  "bulk_delete_test_clients",
  "agent_activated"
]);
export const severityEnum = pgEnum("severity", ["info", "warning", "error", "critical"]);
export const conversationStatusEnum = pgEnum("conversationStatus", ["active", "paused", "closed"]);
export const messageRoleEnum = pgEnum("messageRole", ["user", "assistant", "system"]);
export const mediaTypeEnum = pgEnum("mediaType", ["text", "audio", "image", "document"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"), // Hash da senha para login admin
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tenants (Inquilinos) - Clientes da plataforma SaaS
 */
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(), // Referência ao usuário proprietário
  companyName: varchar("companyName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  status: statusEnum("status").default("active").notNull(),
  
  // Autenticação
  passwordHash: text("passwordHash"), // Hash da senha do cliente
  isActivated: boolean("isActivated").default(false).notNull(), // Se já ativou a conta
  
  // Informações de provisionamento
  n8nWorkflowId: varchar("n8nWorkflowId", { length: 100 }),
  evolutionInstanceName: varchar("evolutionInstanceName", { length: 100 }),
  evolutionApiKey: text("evolutionApiKey"),
  chatwootInboxId: integer("chatwootInboxId"),
  dbHost: varchar("dbHost", { length: 255 }),
  dbPort: integer("dbPort"),
  dbName: varchar("dbName", { length: 100 }),
  dbUser: varchar("dbUser", { length: 100 }),
  dbPassword: text("dbPassword"), // Armazenado criptografado
  
  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  subscriptionStatus: subscriptionStatusEnum("subscriptionStatus"),
  currentPlanId: integer("currentPlanId"),
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/**
 * Planos de assinatura
 */
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  stripePriceId: varchar("stripePriceId", { length: 100 }).notNull(),
  priceMonthly: integer("priceMonthly").notNull(), // Em centavos
  
  // Limites do plano
  maxWorkflowExecutions: integer("maxWorkflowExecutions").default(1000),
  maxConversations: integer("maxConversations").default(10000),
  maxStorageGB: integer("maxStorageGB").default(5),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Configurações do agente por inquilino
 */
export const agentConfigs = pgTable("agentConfigs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().unique(),
  
  // Configurações do agente
  systemPrompt: text("systemPrompt"),
  companyInfo: text("companyInfo"), // JSON com informações da empresa
  welcomeMessage: text("welcomeMessage"),
  
  // Configurações de comportamento
  enableHumanHandoff: boolean("enableHumanHandoff").default(true),
  enableAudioTranscription: boolean("enableAudioTranscription").default(true),
  enableImageProcessing: boolean("enableImageProcessing").default(true),
  
  // Configurações de Tools/Agentes Especialistas (JSON)
  toolsConfig: text("toolsConfig"), // JSON: { enabledTools: [], toolSettings: {} }
  schedulingConfig: text("schedulingConfig"), // JSON: { enabled: boolean, settings: {} }
  ragConfig: text("ragConfig"), // JSON: { enabled: boolean, kbId: string, apiUrl: string }
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;

/**
 * Métricas de consumo por inquilino
 */
export const usageMetrics = pgTable("usageMetrics", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  
  // Período da métrica
  periodStart: timestamp("periodStart", { withTimezone: true }).notNull(),
  periodEnd: timestamp("periodEnd", { withTimezone: true }).notNull(),
  
  // Métricas de uso
  workflowExecutions: integer("workflowExecutions").default(0),
  totalConversations: integer("totalConversations").default(0),
  totalMessages: integer("totalMessages").default(0),
  apiCallsOpenAI: integer("apiCallsOpenAI").default(0),
  storageUsedMB: integer("storageUsedMB").default(0),
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

/**
 * Log de eventos importantes da plataforma
 */
export const platformLogs = pgTable("platformLogs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  eventType: eventTypeEnum("eventType").notNull(),
  
  severity: severityEnum("severity").default("info").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON com detalhes adicionais
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type PlatformLog = typeof platformLogs.$inferSelect;
export type InsertPlatformLog = typeof platformLogs.$inferInsert;

/**
 * System configuration table - stores platform settings
 */
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue"),
  isEncrypted: boolean("isEncrypted").default(false).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Contatos dos clientes (compartilhado entre todos os tenants, isolado por tenantId)
 */
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  
  // Status do contato
  isActive: boolean("isActive").default(true),
  lastInteraction: timestamp("lastInteraction", { withTimezone: true }),
  
  // Metadados
  metadata: text("metadata"), // JSON com dados adicionais
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Conversas (compartilhado entre todos os tenants, isolado por tenantId)
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  contactId: integer("contactId").notNull(),
  
  // Status da conversa
  status: conversationStatusEnum("status").default("active").notNull(),
  aiPaused: boolean("aiPaused").default(false), // Se IA está pausada (atendimento humano)
  
  // Timestamps
  startedAt: timestamp("startedAt", { withTimezone: true }).defaultNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt", { withTimezone: true }),
  closedAt: timestamp("closedAt", { withTimezone: true }),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Mensagens de chat (compartilhado entre todos os tenants, isolado por tenantId)
 */
export const chatMessages = pgTable("chatMessages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  conversationId: integer("conversationId").notNull(),
  contactId: integer("contactId").notNull(),
  
  // Conteúdo da mensagem
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  
  // Tipo de mídia
  mediaType: mediaTypeEnum("mediaType").default("text"),
  mediaUrl: text("mediaUrl"),
  
  // Metadados
  metadata: text("metadata"), // JSON com dados adicionais (tokens, modelo usado, etc)
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Tokens de ativação de conta
 */
export const activationTokens = pgTable("activationTokens", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().unique(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  usedAt: timestamp("usedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ActivationToken = typeof activationTokens.$inferSelect;
export type InsertActivationToken = typeof activationTokens.$inferInsert;
