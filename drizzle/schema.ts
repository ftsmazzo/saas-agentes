import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tenants (Inquilinos) - Clientes da plataforma SaaS
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(), // Referência ao usuário proprietário
  companyName: varchar("companyName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  status: mysqlEnum("status", ["active", "suspended", "deleted"]).default("active").notNull(),
  
  // Autenticação
  passwordHash: text("passwordHash"), // Hash da senha do cliente
  isActivated: boolean("isActivated").default(false).notNull(), // Se já ativou a conta
  
  // Informações de provisionamento
  n8nWorkflowId: varchar("n8nWorkflowId", { length: 100 }),
  evolutionInstanceName: varchar("evolutionInstanceName", { length: 100 }),
  evolutionApiKey: text("evolutionApiKey"),
  chatwootInboxId: int("chatwootInboxId"),
  dbHost: varchar("dbHost", { length: 255 }),
  dbPort: int("dbPort"),
  dbName: varchar("dbName", { length: 100 }),
  dbUser: varchar("dbUser", { length: 100 }),
  dbPassword: text("dbPassword"), // Armazenado criptografado
  
  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "past_due", "canceled", "incomplete", "trialing"]),
  currentPlanId: int("currentPlanId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/**
 * Planos de assinatura
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  stripePriceId: varchar("stripePriceId", { length: 100 }).notNull(),
  priceMonthly: int("priceMonthly").notNull(), // Em centavos
  
  // Limites do plano
  maxWorkflowExecutions: int("maxWorkflowExecutions").default(1000),
  maxConversations: int("maxConversations").default(10000),
  maxStorageGB: int("maxStorageGB").default(5),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Configurações do agente por inquilino
 */
export const agentConfigs = mysqlTable("agentConfigs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  
  // Configurações do agente
  systemPrompt: text("systemPrompt"),
  companyInfo: text("companyInfo"), // JSON com informações da empresa
  welcomeMessage: text("welcomeMessage"),
  
  // Configurações de comportamento
  enableHumanHandoff: boolean("enableHumanHandoff").default(true),
  enableAudioTranscription: boolean("enableAudioTranscription").default(true),
  enableImageProcessing: boolean("enableImageProcessing").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;

/**
 * Métricas de consumo por inquilino
 */
export const usageMetrics = mysqlTable("usageMetrics", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  
  // Período da métrica
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  // Métricas de uso
  workflowExecutions: int("workflowExecutions").default(0),
  totalConversations: int("totalConversations").default(0),
  totalMessages: int("totalMessages").default(0),
  apiCallsOpenAI: int("apiCallsOpenAI").default(0),
  storageUsedMB: int("storageUsedMB").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

/**
 * Log de eventos importantes da plataforma
 */
export const platformLogs = mysqlTable("platformLogs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  eventType: mysqlEnum("eventType", [
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
    "email_failed"
  ]).notNull(),
  
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("info").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON com detalhes adicionais
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlatformLog = typeof platformLogs.$inferSelect;
export type InsertPlatformLog = typeof platformLogs.$inferInsert;

/**
 * System configuration table - stores platform settings
 */
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue"),
  isEncrypted: boolean("isEncrypted").default(false).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Contatos dos clientes (compartilhado entre todos os tenants, isolado por tenantId)
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(), // Isolamento multi-tenant
  
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  
  // Status do contato
  isActive: boolean("isActive").default(true),
  lastInteraction: timestamp("lastInteraction"),
  
  // Metadados
  metadata: text("metadata"), // JSON com dados adicionais
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Conversas (compartilhado entre todos os tenants, isolado por tenantId)
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(), // Isolamento multi-tenant
  contactId: int("contactId").notNull(),
  
  // Status da conversa
  status: mysqlEnum("status", ["active", "paused", "closed"]).default("active").notNull(),
  aiPaused: boolean("aiPaused").default(false), // Se IA está pausada (atendimento humano)
  
  // Timestamps
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  closedAt: timestamp("closedAt"),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Mensagens de chat (compartilhado entre todos os tenants, isolado por tenantId)
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(), // Isolamento multi-tenant
  conversationId: int("conversationId").notNull(),
  contactId: int("contactId").notNull(),
  
  // Conteúdo da mensagem
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  
  // Tipo de mídia
  mediaType: mysqlEnum("mediaType", ["text", "audio", "image", "document"]).default("text"),
  mediaUrl: text("mediaUrl"),
  
  // Metadados
  metadata: text("metadata"), // JSON com dados adicionais (tokens, modelo usado, etc)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Tokens de ativação de conta
 */
export const activationTokens = mysqlTable("activationTokens", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivationToken = typeof activationTokens.$inferSelect;
export type InsertActivationToken = typeof activationTokens.$inferInsert;
