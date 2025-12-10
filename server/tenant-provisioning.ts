import { getDb } from "./db";
import { tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Provisiona recursos para um novo tenant
 * 
 * Como funciona:
 * - Não cria banco de dados separado
 * - Usa o banco MySQL compartilhado com isolamento por tenant_id
 * - Todas as tabelas (contacts, conversations, chatMessages) já existem
 * - O isolamento é garantido por filtros WHERE tenant_id = X em todas as queries
 */

export interface ProvisionTenantParams {
  tenantId: number;
  companyName: string;
}

export interface ProvisionResult {
  success: boolean;
  tenantId: number;
  dbConnectionString?: string;
  error?: string;
}

/**
 * Provisiona um tenant no modelo multi-tenant compartilhado
 * 
 * Neste modelo:
 * 1. Todos os tenants usam o mesmo banco de dados MySQL
 * 2. Isolamento é feito por tenant_id em cada tabela
 * 3. Não há criação de banco separado
 * 4. O N8N workflow do cliente vai usar as mesmas credenciais do banco principal
 */
export async function provisionTenant(params: ProvisionTenantParams): Promise<ProvisionResult> {
  const { tenantId, companyName } = params;

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Gerar string de conexão para o tenant
    // Usa o mesmo banco, mas o workflow N8N vai filtrar por tenant_id
    const dbConnectionString = process.env.DATABASE_URL || "";
    
    if (!dbConnectionString) {
      throw new Error("DATABASE_URL not configured");
    }

    // Atualizar informações de conexão do tenant
    await db
      .update(tenants)
      .set({
        dbHost: "shared-mysql", // Indicador de que usa banco compartilhado
        dbName: `tenant_${tenantId}`, // Namespace lógico (não é um banco real)
        dbUser: "shared",
        dbPassword: "shared",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    console.log(`[Provisioning] Tenant ${tenantId} (${companyName}) provisioned successfully`);

    return {
      success: true,
      tenantId,
      dbConnectionString,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Provisioning] Failed to provision tenant ${tenantId}:`, errorMessage);

    return {
      success: false,
      tenantId,
      error: errorMessage,
    };
  }
}

/**
 * Retorna as credenciais de banco de dados para um tenant
 * No modelo compartilhado, retorna as credenciais do banco principal
 */
export async function getTenantDatabaseCredentials(tenantId: number) {
  const dbUrl = process.env.DATABASE_URL || "";
  
  if (!dbUrl) {
    throw new Error("DATABASE_URL not configured");
  }

  // Parse da connection string
  // Formato: mysql://user:password@host:port/database
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (!urlMatch) {
    throw new Error("Invalid DATABASE_URL format");
  }

  const [, user, password, host, port, database] = urlMatch;

  return {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    tenantId, // Importante: o workflow N8N precisa saber qual tenant_id usar nas queries
  };
}

/**
 * Remove recursos de um tenant (soft delete)
 */
export async function deprovisionTenant(tenantId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // No modelo compartilhado, apenas marcamos como deletado
    // Os dados permanecem no banco para auditoria/recuperação
    await db
      .update(tenants)
      .set({
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    console.log(`[Provisioning] Tenant ${tenantId} marked as deleted`);
    return true;
  } catch (error) {
    console.error(`[Provisioning] Failed to deprovision tenant ${tenantId}:`, error);
    return false;
  }
}
