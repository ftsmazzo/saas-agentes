import { pgTable, pgEnum, text, timestamp, varchar, boolean, integer, serial, numeric, jsonb, customType } from "drizzle-orm/pg-core";

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
  "agent_activated",
  "agent_deactivated"
]);
export const severityEnum = pgEnum("severity", ["info", "warning", "error", "critical"]);
export const conversationStatusEnum = pgEnum("conversationStatus", ["active", "paused", "closed"]);
export const messageRoleEnum = pgEnum("messageRole", ["user", "assistant", "system"]);
export const mediaTypeEnum = pgEnum("mediaType", ["text", "audio", "image", "document"]);
export const agentStatusEnum = pgEnum("agentStatus", ["active", "paused", "deleted"]);

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
 * Tenants (Empresas/Clientes) - Clientes da plataforma SaaS
 * Cada tenant representa uma empresa que pode ter múltiplos agentes de IA
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
  
  // Informações de provisionamento Chatwoot (COMPARTILHADAS entre todos os agentes da empresa)
  // Esses campos são por TENANT (empresa), não por agente
  chatwootAgentId: integer("chatwootAgentId"), // ID do Agente Humano (User) - aparece no WhatsApp quando humano interage via Chatwoot
  chatwootAgentBotId: integer("chatwootAgentBotId"), // ID do Agent Bot - credencial compartilhada para envio de mensagens
  chatwootAgentBotToken: text("chatwootAgentBotToken"), // Token do Agent Bot - credencial compartilhada para envio de mensagens
  // NOTA: chatwootInboxId foi movido para tabela agents (cada agente tem seu próprio inbox)
  // NOTA: n8nWorkflowId, evolutionInstanceName, evolutionApiKey foram movidos para tabela agents (cada agente tem suas integrações)
  // NOTA: Campos de DB (dbHost, dbPort, dbName, dbUser, dbPassword) foram removidos - usa DB único compartilhado
  
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
  
  // Sistema de créditos
  monthlyCredits: integer("monthlyCredits").default(10000), // Créditos mensais incluídos
  
  // Features por plano (sistema progressivo)
  maxAgents: integer("maxAgents").default(1), // Número máximo de agentes
  enableScheduling: boolean("enableScheduling").default(false), // Agendamento
  enableFAQ: boolean("enableFAQ").default(false), // FAQ/Base de Conhecimento Simples
  enableAdvancedAnalytics: boolean("enableAdvancedAnalytics").default(false), // Analytics Avançados
  enableCustomAPI: boolean("enableCustomAPI").default(false), // API Personalizada
  enableCustomWebhooks: boolean("enableCustomWebhooks").default(false), // Webhooks Personalizados
  enablePrioritySupport: boolean("enablePrioritySupport").default(false), // Suporte Prioritário
  enableRAG: boolean("enableRAG").default(false), // RAG (Base de Conhecimento Avançada)
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Agentes de IA - Múltiplos agentes por empresa (tenant)
 * Cada empresa pode ter vários agentes, cada um com suas próprias integrações
 * 
 * IMPORTANTE:
 * - Cada agente precisa de seu próprio inbox no Chatwoot
 * - Cada agente tem seu próprio workflow no N8N
 * - Cada agente tem sua própria instância Evolution API
 * - Mas compartilham: chatwootAgentId, chatwootAgentBotId, chatwootAgentBotToken (estão em tenants)
 */
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Referência à empresa (tenant) - permite múltiplos agentes por empresa
  
  // Informações básicas do agente
  name: varchar("name", { length: 255 }).notNull(), // Nome do agente (definido pelo usuário na criação)
  description: text("description"),
  status: agentStatusEnum("status").default("active").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  
  // Integrações específicas do agente (cada agente tem suas próprias)
  n8nWorkflowId: varchar("n8nWorkflowId", { length: 100 }), // Workflow N8N específico deste agente
  evolutionInstanceName: varchar("evolutionInstanceName", { length: 100 }), // Instância Evolution específica deste agente
  evolutionApiKey: text("evolutionApiKey"), // API Key da Evolution para este agente
  chatwootInboxId: integer("chatwootInboxId"), // Inbox do Chatwoot específico deste agente (cada agente precisa de um inbox)
  
  // Metadados
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Configurações do agente (uma por agente)
 * Agora referenciando agentId ao invés de tenantId único
 */
export const agentConfigs = pgTable("agentConfigs", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull().unique(), // Referência ao agente (único - uma config por agente)
  
  // Configurações do agente
  systemPrompt: text("systemPrompt"),
  companyInfo: text("companyInfo"), // JSON com informações da empresa
  welcomeMessage: text("welcomeMessage"),
  
  // Configurações de comportamento
  enableHumanHandoff: boolean("enableHumanHandoff").default(true),
  enableAudioTranscription: boolean("enableAudioTranscription").default(true),
  enableImageProcessing: boolean("enableImageProcessing").default(true),
  
  // Modelo de IA
  openaiModel: varchar("openaiModel", { length: 50 }).default("gpt-4o-mini"),
  
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
  
  // Métricas de tokens e custos (agregação mensal)
  tokensChat: integer("tokensChat").default(0),
  tokensAudio: integer("tokensAudio").default(0),
  tokensImage: integer("tokensImage").default(0),
  tokensFormat: integer("tokensFormat").default(0), // Formatação de resposta
  costChatUSD: numeric("costChatUSD", { precision: 10, scale: 6 }).default("0"),
  costAudioUSD: numeric("costAudioUSD", { precision: 10, scale: 6 }).default("0"),
  costImageUSD: numeric("costImageUSD", { precision: 10, scale: 6 }).default("0"),
  costFormatUSD: numeric("costFormatUSD", { precision: 10, scale: 6 }).default("0"),
  totalCostUSD: numeric("totalCostUSD", { precision: 10, scale: 6 }).default("0"),
  totalCreditsUsed: integer("totalCreditsUsed").default(0),
  
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
 * Compatível com tabela 'chats' do template
 * Agora também vinculado a um agente específico
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  agentId: integer("agentId"), // Agente específico (opcional para compatibilidade)
  contactId: integer("contactId").notNull(),
  
  // Status da conversa
  status: conversationStatusEnum("status").default("active").notNull(),
  aiPaused: boolean("aiPaused").default(false), // Se IA está pausada (atendimento humano)
  
  // Campos adicionais do template 'chats'
  phone: text("phone"), // Telefone (compatibilidade com template)
  etapaFollowup: numeric("etapaFollowup"), // Etapa do follow-up (etapa_followup)
  
  // Timestamps
  startedAt: timestamp("startedAt", { withTimezone: true }).defaultNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt", { withTimezone: true }),
  closedAt: timestamp("closedAt", { withTimezone: true }),
  updatedAt: text("updatedAt"), // Campo texto para compatibilidade com template
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Mensagens de chat (compartilhado entre todos os tenants, isolado por tenantId)
 * Compatível com tabela 'chat_messages' do template
 * Agora também vinculado a um agente específico
 */
export const chatMessages = pgTable("chatMessages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  agentId: integer("agentId"), // Agente específico (opcional para compatibilidade)
  conversationId: integer("conversationId").notNull(),
  contactId: integer("contactId").notNull(),
  
  // Conteúdo da mensagem
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  
  // Tipo de mídia
  mediaType: mediaTypeEnum("mediaType").default("text"),
  mediaUrl: text("mediaUrl"),
  
  // Campos adicionais do template 'chat_messages'
  phone: text("phone"), // Telefone (compatibilidade)
  nomewpp: text("nomewpp"), // Nome do WhatsApp
  botMessage: text("botMessage"), // Mensagem do bot
  userMessage: text("userMessage"), // Mensagem do usuário
  messageType: text("messageType"), // Tipo de mensagem
  active: boolean("active").default(true), // Se a mensagem está ativa
  
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

/**
 * Tipo customizado para vector (pgvector)
 * Nota: Drizzle não tem suporte nativo, então usamos text no schema
 * e criamos o tipo vector diretamente no SQL
 */
const vector = customType<{ data: string; driverData: string }>({
  dataType: () => 'vector(1536)',
});

/**
 * Dados do cliente (substitui dados_cliente do template)
 * Armazena informações específicas de atendimento por cliente
 */
export const clientData = pgTable("clientData", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  
  phone: text("phone").notNull(), // Telefone do cliente
  name: text("name"), // Nome do WhatsApp (nomewpp)
  aiService: text("aiService"), // Tipo de atendimento da IA (atendimento_ia)
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ClientData = typeof clientData.$inferSelect;
export type InsertClientData = typeof clientData.$inferInsert;

/**
 * Documentos para RAG (Retrieval Augmented Generation)
 * Armazena documentos com embeddings vetoriais para busca semântica
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(), // Isolamento multi-tenant
  
  content: text("content").notNull(), // Conteúdo do documento
  metadata: jsonb("metadata"), // Metadados em JSON (corresponde a Document.metadata)
  embedding: text("embedding"), // Vector embedding (1536 dimensões para OpenAI)
  // Nota: No SQL criamos como vector(1536), mas no Drizzle usamos text
  // O tipo real será criado via SQL direto
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Transações detalhadas de uso (histórico completo)
 * Agora também rastreia qual agente utilizou os créditos
 */
export const usageTransactions = pgTable("usageTransactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  agentId: integer("agentId"), // Agente específico que utilizou (opcional para compatibilidade)
  
  // Tipo de operação
  operation: varchar("operation", { length: 20 }).notNull(), // 'chat', 'audio', 'image', 'format', 'pdf'
  model: varchar("model", { length: 50 }).notNull(), // 'gpt-4o', 'whisper-1', 'gpt-4o-vision', etc.
  
  // Tokens utilizados
  tokensInput: integer("tokensInput").default(0),
  tokensOutput: integer("tokensOutput").default(0),
  totalTokens: integer("totalTokens").default(0),
  
  // Custos e créditos
  costUSD: numeric("costUSD", { precision: 10, scale: 6 }).default("0"), // Custo real em USD
  creditsUsed: integer("creditsUsed").default(0), // Créditos internos consumidos
  
  // Metadados
  metadata: text("metadata"), // JSON com detalhes adicionais (workflowId, nodeName, etc)
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UsageTransaction = typeof usageTransactions.$inferSelect;
export type InsertUsageTransaction = typeof usageTransactions.$inferInsert;

/**
 * Saldo de créditos por tenant
 */
export const tenantCredits = pgTable("tenantCredits", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull().unique(),
  
  // Saldo atual
  currentCredits: integer("currentCredits").default(0),
  
  // Totais acumulados
  totalCreditsPurchased: integer("totalCreditsPurchased").default(0),
  totalCreditsUsed: integer("totalCreditsUsed").default(0),
  totalCreditsBonus: integer("totalCreditsBonus").default(0), // Bônus e resets mensais
  extrasPurchased: integer("extrasPurchased").default(0), // Créditos extras comprados (preservados no reset mensal)
  
  // Controle de reset mensal
  lastResetDate: timestamp("lastResetDate", { withTimezone: true }),
  
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type TenantCredit = typeof tenantCredits.$inferSelect;
export type InsertTenantCredit = typeof tenantCredits.$inferInsert;

/**
 * Preços dos modelos OpenAI (parametrizável)
 */
export const openaiPricing = pgTable("openaiPricing", {
  id: serial("id").primaryKey(),
  model: varchar("model", { length: 50 }).notNull().unique(),
  
  // Preços por 1M tokens (USD)
  priceInputPer1M: numeric("priceInputPer1M", { precision: 10, scale: 4 }), // Input tokens
  priceOutputPer1M: numeric("priceOutputPer1M", { precision: 10, scale: 4 }), // Output tokens
  pricePerMinute: numeric("pricePerMinute", { precision: 10, scale: 4 }), // Para Whisper (por minuto de áudio)
  
  isActive: boolean("isActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type OpenAIPricing = typeof openaiPricing.$inferSelect;
export type InsertOpenAIPricing = typeof openaiPricing.$inferInsert;

/**
 * Configuração de conversão de créditos (parametrizável)
 */
export const creditConfig = pgTable("creditConfig", {
  id: serial("id").primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue").notNull(), // JSON com configurações
  description: text("description"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type CreditConfig = typeof creditConfig.$inferSelect;
export type InsertCreditConfig = typeof creditConfig.$inferInsert;
