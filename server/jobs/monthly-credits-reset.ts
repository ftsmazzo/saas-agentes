/**
 * Job de Reset Mensal de Créditos
 * 
 * Este job deve ser executado no primeiro dia de cada mês
 * para resetar os créditos dos tenants para o valor do plano
 */

import { getDb } from "../db";
import { tenants, tenantCredits, plans } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Reseta créditos mensais de todos os tenants ativos
 * Define os créditos para o valor do plano (não adiciona, substitui)
 */
export async function resetMonthlyCredits(): Promise<{
  success: boolean;
  tenantsProcessed: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const errors: string[] = [];
  let tenantsProcessed = 0;

  console.log(`[Monthly Credits Reset] 🚀 Iniciando reset mensal de créditos...`);

  try {
    // Buscar todos os tenants ativos com plano
    const allTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.status, "active"));

    console.log(`[Monthly Credits Reset] 📊 Encontrados ${allTenants.length} tenants ativos`);

    for (const tenant of allTenants) {
      try {
        // Buscar plano do tenant
        if (!tenant.currentPlanId) {
          console.warn(`[Monthly Credits Reset] ⚠️ Tenant ${tenant.id} não tem plano associado`);
          continue;
        }

        const plan = await db
          .select()
          .from(plans)
          .where(eq(plans.id, tenant.currentPlanId))
          .limit(1);

        if (!plan[0] || !plan[0].monthlyCredits) {
          console.warn(
            `[Monthly Credits Reset] ⚠️ Plano ${tenant.currentPlanId} não encontrado ou sem monthlyCredits`
          );
          continue;
        }

        const monthlyCredits = plan[0].monthlyCredits;
        const now = new Date();

        // Buscar registro de créditos existente
        const existingCredits = await db
          .select()
          .from(tenantCredits)
          .where(eq(tenantCredits.tenantId, tenant.id))
          .limit(1);

        if (existingCredits[0]) {
          // Atualizar: resetar para o valor do plano
          await db
            .update(tenantCredits)
            .set({
              currentCredits: monthlyCredits,
              lastResetDate: now,
              updatedAt: now,
            })
            .where(eq(tenantCredits.tenantId, tenant.id));

          console.log(
            `[Monthly Credits Reset] ✅ Tenant ${tenant.id} (${tenant.companyName}): Resetado para ${monthlyCredits} créditos`
          );
        } else {
          // Criar registro inicial
          await db.insert(tenantCredits).values({
            tenantId: tenant.id,
            currentCredits: monthlyCredits,
            totalCreditsPurchased: monthlyCredits,
            lastResetDate: now,
          });

          console.log(
            `[Monthly Credits Reset] ✅ Tenant ${tenant.id} (${tenant.companyName}): Criado com ${monthlyCredits} créditos`
          );
        }

        tenantsProcessed++;

        // Criar log de plataforma (usando eventType existente)
        try {
          const { createPlatformLog } = await import("../db");
          await createPlatformLog({
            tenantId: tenant.id,
            eventType: "config_updated", // Usar eventType existente
            severity: "info",
            message: `Créditos resetados para ${monthlyCredits} (reset mensal)`,
            metadata: JSON.stringify({
              planId: tenant.currentPlanId,
              monthlyCredits,
              resetDate: now.toISOString(),
              resetType: "monthly",
            }),
          });
        } catch (logError: any) {
          // Não falhar o reset se o log falhar
          console.warn(`[Monthly Credits Reset] ⚠️ Erro ao criar log (não bloqueia):`, logError.message);
        }
      } catch (error: any) {
        const errorMsg = `Tenant ${tenant.id}: ${error.message}`;
        console.error(`[Monthly Credits Reset] ❌ Erro ao processar tenant ${tenant.id}:`, error);
        errors.push(errorMsg);
      }
    }

    console.log(
      `[Monthly Credits Reset] ✅ Concluído: ${tenantsProcessed} tenants processados, ${errors.length} erros`
    );

    return {
      success: errors.length === 0,
      tenantsProcessed,
      errors,
    };
  } catch (error: any) {
    console.error(`[Monthly Credits Reset] ❌ Erro fatal:`, error);
    throw error;
  }
}

/**
 * Executa o reset mensal (para ser chamado por cron ou manualmente)
 */
export async function runMonthlyCreditsReset() {
  try {
    const result = await resetMonthlyCredits();
    console.log(`[Monthly Credits Reset] Resultado:`, result);
    return result;
  } catch (error: any) {
    console.error(`[Monthly Credits Reset] Falha ao executar:`, error);
    throw error;
  }
}

