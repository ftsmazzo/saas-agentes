import { eq } from "drizzle-orm";
import { systemConfig } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Get a configuration value from the database
 */
export async function getConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, key))
    .limit(1);

  return result.length > 0 ? result[0].configValue : null;
}

/**
 * Set a configuration value in the database
 */
export async function setConfig(
  key: string,
  value: string,
  description?: string,
  isEncrypted: boolean = false
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(systemConfig)
    .values({
      configKey: key,
      configValue: value,
      description,
      isEncrypted,
    })
    .onDuplicateKeyUpdate({
      set: {
        configValue: value,
        description,
        isEncrypted,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get all configurations
 */
export async function getAllConfigs(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};

  const results = await db.select().from(systemConfig);

  const configs: Record<string, string> = {};
  for (const config of results) {
    if (config.configValue) {
      configs[config.configKey] = config.configValue;
    }
  }

  return configs;
}

/**
 * Delete a configuration
 */
export async function deleteConfig(key: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(systemConfig).where(eq(systemConfig.configKey, key));
}

/**
 * Configuration keys used in the platform
 */
export const CONFIG_KEYS = {
  // N8N
  N8N_API_URL: "n8n_api_url",
  N8N_API_KEY: "n8n_api_key",
  N8N_TEMPLATE_WORKFLOW_ID: "n8n_template_workflow_id",

  // PostgreSQL Master (deprecated - usando MySQL compartilhado)
  POSTGRES_MASTER_HOST: "postgres_master_host",
  POSTGRES_MASTER_PORT: "postgres_master_port",
  POSTGRES_MASTER_USER: "postgres_master_user",
  POSTGRES_MASTER_PASSWORD: "postgres_master_password",
  POSTGRES_MASTER_DB: "postgres_master_db",

  // Stripe
  STRIPE_SECRET_KEY: "stripe_secret_key",
  STRIPE_WEBHOOK_SECRET: "stripe_webhook_secret",

  // Platform
  SETUP_COMPLETED: "setup_completed",
} as const;
