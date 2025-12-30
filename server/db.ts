import { eq, desc, and, gte, lte, ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, 
  users,
  tenants,
  Tenant,
  InsertTenant,
  plans,
  Plan,
  InsertPlan,
  agentConfigs,
  AgentConfig,
  InsertAgentConfig,
  usageMetrics,
  UsageMetric,
  InsertUsageMetric,
  platformLogs,
  PlatformLog,
  InsertPlatformLog,
  activationTokens,
  conversations,
  Conversation,
  chatMessages,
  ChatMessage,
  contacts,
  Contact
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== USER OPERATIONS ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Lista todos os usuários
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

/**
 * Cria um novo usuário
 */
export async function createUser(userData: InsertUser): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(userData).returning();
  if (!result[0]) throw new Error("Failed to create user");
  
  return result[0];
}

/**
 * Atualiza um usuário
 */
export async function updateUser(id: number, updates: Partial<InsertUser>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(updates).where(eq(users.id, id));
}

/**
 * Deleta um usuário
 */
export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, id));
}

// ========== TENANT OPERATIONS ==========

export async function createTenant(tenant: InsertTenant): Promise<Tenant> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remover campos undefined para usar defaults do banco
  const cleanTenant: any = {};
  for (const [key, value] of Object.entries(tenant)) {
    if (value !== undefined) {
      // Normalizar email (trim e lowercase)
      if (key === 'email' && typeof value === 'string') {
        cleanTenant[key] = value.trim().toLowerCase();
      } else {
        cleanTenant[key] = value;
      }
    }
  }

  const result = await db.insert(tenants).values(cleanTenant).returning();
  if (!result[0]) throw new Error("Failed to create tenant");
  
  return result[0];
}

export async function getTenantById(id: number): Promise<Tenant | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
  return result[0];
}

export async function getAllTenants(): Promise<Tenant[]> {
  const db = await getDb();
  if (!db) return [];

  // Filtrar apenas tenants que não foram deletados
  // Hard delete remove completamente, então não aparecerá na query
  // Soft delete (status = 'deleted') também não será mostrado
  return await db.select()
    .from(tenants)
    .where(
      // Excluir tenants com status 'deleted' (soft delete)
      // Hard delete já remove completamente, então não precisa filtrar
      ne(tenants.status, 'deleted')
    )
    .orderBy(desc(tenants.createdAt));
}

export async function updateTenant(id: number, updates: Partial<InsertTenant>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Log para debug
  console.log(`[DB] 💾 Atualizando tenant ${id} com:`, JSON.stringify(updates));
  
  await db.update(tenants).set(updates).where(eq(tenants.id, id));
  
  // Verificar se foi atualizado
  const updated = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (updated[0]) {
    console.log(`[DB] ✅ Tenant ${id} atualizado. chatwootAgentBotId=${updated[0].chatwootAgentBotId}, chatwootAgentBotToken=${updated[0].chatwootAgentBotToken ? '***' + updated[0].chatwootAgentBotToken.slice(-4) : 'NULL'}`);
  }
}

export async function deleteTenant(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Hard delete - deletar fisicamente do banco
  await db.delete(tenants).where(eq(tenants.id, id));
  
  // Também deletar configurações do agente relacionadas
  await db.delete(agentConfigs).where(eq(agentConfigs.tenantId, id));
  
  // Deletar tokens de ativação
  await db.delete(activationTokens).where(eq(activationTokens.tenantId, id));
}

// ========== PLAN OPERATIONS ==========

export async function createPlan(plan: InsertPlan): Promise<Plan> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(plans).values(plan).returning();
  if (!result[0]) throw new Error("Failed to create plan");
  
  return result[0];
}

export async function getAllPlans(): Promise<Plan[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(plans).where(eq(plans.isActive, true));
}

export async function getPlanById(id: number): Promise<Plan | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return result[0];
}

// ========== AGENT CONFIG OPERATIONS ==========

export async function createAgentConfig(config: InsertAgentConfig): Promise<AgentConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agentConfigs).values(config).returning();
  if (!result[0]) throw new Error("Failed to create agent config");
  
  return result[0];
}

export async function getAgentConfigByTenantId(tenantId: number): Promise<AgentConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agentConfigs).where(eq(agentConfigs.tenantId, tenantId)).limit(1);
  return result[0];
}

export async function updateAgentConfig(tenantId: number, updates: Partial<InsertAgentConfig>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agentConfigs).set(updates).where(eq(agentConfigs.tenantId, tenantId));
}

// ========== USAGE METRICS OPERATIONS ==========

export async function createUsageMetric(metric: InsertUsageMetric): Promise<UsageMetric> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(usageMetrics).values(metric).returning();
  if (!result[0]) throw new Error("Failed to create usage metric");
  
  return result[0];
}

export async function getUsageMetricsByTenantId(
  tenantId: number,
  startDate?: Date,
  endDate?: Date
): Promise<UsageMetric[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(usageMetrics).where(eq(usageMetrics.tenantId, tenantId));

  if (startDate && endDate) {
    const conditions = and(
      eq(usageMetrics.tenantId, tenantId),
      gte(usageMetrics.periodStart, startDate),
      lte(usageMetrics.periodEnd, endDate)
    );
    if (conditions) {
      return await db.select().from(usageMetrics).where(conditions).orderBy(desc(usageMetrics.periodStart));
    }
  }

  return await query.orderBy(desc(usageMetrics.periodStart));
}

export async function getCurrentMonthUsage(tenantId: number): Promise<UsageMetric | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const conditions = and(
    eq(usageMetrics.tenantId, tenantId),
    gte(usageMetrics.periodStart, startOfMonth),
    lte(usageMetrics.periodEnd, endOfMonth)
  );

  if (!conditions) return undefined;

  const result = await db.select().from(usageMetrics).where(conditions).limit(1);
  return result[0];
}

// ========== PLATFORM LOGS OPERATIONS ==========

export async function createPlatformLog(log: InsertPlatformLog): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create log: database not available");
    return;
  }

  try {
    await db.insert(platformLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create platform log:", error);
  }
}

export async function getPlatformLogs(
  tenantId?: number,
  limit: number = 100
): Promise<PlatformLog[]> {
  const db = await getDb();
  if (!db) return [];

  if (tenantId) {
    return await db.select().from(platformLogs)
      .where(eq(platformLogs.tenantId, tenantId))
      .orderBy(desc(platformLogs.createdAt))
      .limit(limit);
  }

  return await db.select().from(platformLogs)
    .orderBy(desc(platformLogs.createdAt))
    .limit(limit);
}

/**
 * Busca tenant pelo ID do usuário proprietário
 */
export async function getTenantByUserId(userId: number): Promise<Tenant | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.ownerId, userId)).limit(1);
  return result[0];
}

/**
 * Busca tenant por email
 */
export async function getTenantByEmail(email: string): Promise<Tenant | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Normalizar email antes de buscar
  const normalizedEmail = email.trim().toLowerCase();

  const result = await db.select().from(tenants).where(eq(tenants.email, normalizedEmail)).limit(1);
  return result[0];
}

/**
 * Busca configuração do agente por tenant ID
 */
export async function getAgentConfig(tenantId: number): Promise<AgentConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agentConfigs).where(eq(agentConfigs.tenantId, tenantId)).limit(1);
  return result[0];
}

// ========== CONVERSATIONS AND MESSAGES OPERATIONS ==========

export async function getConversationsByTenantId(
  tenantId: number,
  limit: number = 50
): Promise<(Conversation & { contact: Contact | null; messages: ChatMessage[] })[]> {
  const db = await getDb();
  if (!db) return [];

  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.tenantId, tenantId))
    .orderBy(desc(conversations.startedAt))
    .limit(limit);

  // Buscar contatos e mensagens para cada conversa
  const result = await Promise.all(
    convs.map(async (conv) => {
      const contact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, conv.contactId))
        .limit(1);

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conv.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(20); // Últimas 20 mensagens

      return {
        ...conv,
        contact: contact[0] || null,
        messages: messages.reverse(), // Ordem cronológica
      };
    })
  );

  return result;
}

export async function getMessagesByConversationIds(
  conversationIds: number[]
): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  if (conversationIds.length === 0) return [];

  // Buscar mensagens de múltiplas conversas
  const messages = await db
    .select()
    .from(chatMessages)
    .where(inArray(chatMessages.conversationId, conversationIds))
    .orderBy(desc(chatMessages.createdAt));

  return messages;
}

/**
 * Busca token de ativação
 */
export async function getActivationToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(activationTokens).where(eq(activationTokens.token, token)).limit(1);
  return result[0] || null;
}

/**
 * Deleta token de ativação
 */
export async function deleteActivationToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(activationTokens).where(eq(activationTokens.token, token));
}

/**
 * Ativa tenant e define senha
 */
export async function activateTenant(tenantId: number, password: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Hash da senha usando bcrypt
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.update(tenants)
    .set({
      status: 'active',
      passwordHash: hashedPassword,
      isActivated: true, // IMPORTANTE: Marcar como ativado
    })
    .where(eq(tenants.id, tenantId))
    .returning();

  if (!result || result.length === 0) {
    throw new Error(`Tenant ${tenantId} não encontrado para ativação`);
  }

  console.log(`[Activate] Tenant ${tenantId} ativado com sucesso. isActivated: ${result[0].isActivated}, status: ${result[0].status}`);
}
