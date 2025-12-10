import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { plans } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq } from "drizzle-orm";

export const plansRouter = router({
  /**
   * List all plans (público - usado na landing page)
   */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return await db.select().from(plans).orderBy(plans.priceMonthly);
  }),

  /**
   * Get a single plan by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  /**
   * Create a new plan
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        description: z.string().optional(),
        stripePriceId: z.string().min(1, "Stripe Price ID é obrigatório"),
        priceMonthly: z.number().int().min(0, "Preço deve ser maior ou igual a 0"),
        maxWorkflowExecutions: z.number().int().min(0).optional(),
        maxConversations: z.number().int().min(0).optional(),
        maxStorageGB: z.number().int().min(0).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(plans).values({
        name: input.name,
        description: input.description || null,
        stripePriceId: input.stripePriceId,
        priceMonthly: input.priceMonthly,
        maxWorkflowExecutions: input.maxWorkflowExecutions || 1000,
        maxConversations: input.maxConversations || 10000,
        maxStorageGB: input.maxStorageGB || 5,
        isActive: input.isActive,
      });

      return {
        success: true,
        message: "Plano criado com sucesso!",
        planId: result[0]?.insertId ? Number(result[0].insertId) : 0,
      };
    }),

  /**
   * Update an existing plan
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        stripePriceId: z.string().min(1).optional(),
        priceMonthly: z.number().int().min(0).optional(),
        maxWorkflowExecutions: z.number().int().min(0).optional(),
        maxConversations: z.number().int().min(0).optional(),
        maxStorageGB: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;

      await db
        .update(plans)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(plans.id, id));

      return {
        success: true,
        message: "Plano atualizado com sucesso!",
      };
    }),

  /**
   * Toggle plan active status
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const plan = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.id))
        .limit(1);

      if (plan.length === 0) {
        throw new Error("Plano não encontrado");
      }

      const newStatus = !plan[0].isActive;

      await db
        .update(plans)
        .set({ isActive: newStatus, updatedAt: new Date() })
        .where(eq(plans.id, input.id));

      return {
        success: true,
        message: `Plano ${newStatus ? "ativado" : "desativado"} com sucesso!`,
        isActive: newStatus,
      };
    }),

  /**
   * Delete a plan (soft delete by deactivating)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if any tenants are using this plan
      // TODO: Add check for tenants using this plan

      await db
        .update(plans)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(plans.id, input.id));

      return {
        success: true,
        message: "Plano desativado com sucesso!",
      };
    }),
});
