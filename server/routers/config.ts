import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getConfig, setConfig, getAllConfigs, CONFIG_KEYS } from "../config";
import axios from "axios";
import { Client } from "pg";

export const configRouter = router({
  /**
   * Get all configurations (without sensitive values)
   */
  getAll: adminProcedure.query(async () => {
    const configs = await getAllConfigs();
    
    // Mask sensitive values
    const safeConfigs: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(configs)) {
      if (key.includes("password") || key.includes("key")) {
        safeConfigs[key] = value ? "********" : "";
      } else {
        safeConfigs[key] = value;
      }
    }
    
    return safeConfigs;
  }),

  /**
   * Test N8N connection
   */
  testN8N: adminProcedure
    .input(
      z.object({
        apiUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Usar valores do input ou das variáveis de ambiente
      const apiUrl = input.apiUrl || process.env.N8N_API_URL || "";
      const apiKey = input.apiKey === "env" ? (process.env.N8N_API_KEY || "") : (input.apiKey || process.env.N8N_API_KEY || "");
      
      if (!apiUrl) {
        return {
          success: false,
          message: "URL da API do N8N não configurada",
        };
      }
      
      if (!apiKey) {
        return {
          success: false,
          message: "API Key do N8N não configurada",
        };
      }
      
      try {
        const response = await axios.get(`${apiUrl}/api/v1/workflows`, {
          headers: {
            "X-N8N-API-KEY": apiKey,
          },
          timeout: 10000,
        });

        return {
          success: true,
          message: `Conexão bem-sucedida! Encontrados ${response.data.data?.length || 0} workflows.`,
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.response?.data?.message || error.message || "Erro ao conectar com N8N",
        };
      }
    }),

  /**
   * Save N8N configuration
   */
  saveN8N: adminProcedure
    .input(
      z.object({
        apiUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
        templateWorkflowId: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Usar valores do input ou das variáveis de ambiente
      const apiUrl = input.apiUrl || process.env.N8N_API_URL || "";
      const apiKey = input.apiKey === "env" ? (process.env.N8N_API_KEY || "") : (input.apiKey || process.env.N8N_API_KEY || "");
      const templateWorkflowId = input.templateWorkflowId || process.env.N8N_TEMPLATE_WORKFLOW_ID || "";
      
      if (!apiUrl || !apiKey || !templateWorkflowId) {
        throw new Error("Configurações do N8N incompletas. Verifique as variáveis de ambiente ou preencha os campos.");
      }
      
      await setConfig(CONFIG_KEYS.N8N_API_URL, apiUrl, "N8N API URL");
      await setConfig(CONFIG_KEYS.N8N_API_KEY, apiKey, "N8N API Key", true);
      await setConfig(
        CONFIG_KEYS.N8N_TEMPLATE_WORKFLOW_ID,
        templateWorkflowId,
        "N8N Template Workflow ID"
      );

      return { success: true, message: "Configurações do N8N salvas com sucesso!" };
    }),

  /**
   * Test PostgreSQL connection
   */
  testPostgreSQL: adminProcedure
    .input(
      z.object({
        host: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        user: z.string().min(1),
        password: z.string().min(1),
        database: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const client = new Client({
        host: input.host,
        port: input.port,
        user: input.user,
        password: input.password,
        database: input.database,
        connectionTimeoutMillis: 10000,
      });

      try {
        await client.connect();
        const result = await client.query("SELECT version()");
        await client.end();

        return {
          success: true,
          message: `Conexão bem-sucedida! PostgreSQL ${result.rows[0].version.split(" ")[1]}`,
        };
      } catch (error: any) {
        try {
          await client.end();
        } catch {}

        return {
          success: false,
          message: error.message || "Erro ao conectar com PostgreSQL",
        };
      }
    }),

  /**
   * Save PostgreSQL configuration
   */
  savePostgreSQL: adminProcedure
    .input(
      z.object({
        host: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        user: z.string().min(1),
        password: z.string().min(1),
        database: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      await setConfig(CONFIG_KEYS.POSTGRES_MASTER_HOST, input.host, "PostgreSQL Master Host");
      await setConfig(CONFIG_KEYS.POSTGRES_MASTER_PORT, input.port.toString(), "PostgreSQL Master Port");
      await setConfig(CONFIG_KEYS.POSTGRES_MASTER_USER, input.user, "PostgreSQL Master User");
      await setConfig(CONFIG_KEYS.POSTGRES_MASTER_PASSWORD, input.password, "PostgreSQL Master Password", true);
      await setConfig(CONFIG_KEYS.POSTGRES_MASTER_DB, input.database, "PostgreSQL Master Database");

      return { success: true, message: "Configurações do PostgreSQL salvas com sucesso!" };
    }),

  /**
   * Save Stripe configuration
   */
  saveStripe: adminProcedure
    .input(
      z.object({
        secretKey: z.string().min(1),
        webhookSecret: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      await setConfig(CONFIG_KEYS.STRIPE_SECRET_KEY, input.secretKey, "Stripe Secret Key", true);
      await setConfig(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, input.webhookSecret, "Stripe Webhook Secret", true);

      return { success: true, message: "Configurações do Stripe salvas com sucesso!" };
    }),

  /**
   * Mark setup as completed
   */
  completeSetup: adminProcedure.mutation(async () => {
    await setConfig(CONFIG_KEYS.SETUP_COMPLETED, "true", "Setup wizard completed");
    return { success: true };
  }),

  /**
   * Check if setup is completed
   */
  isSetupCompleted: adminProcedure.query(async () => {
    const completed = await getConfig(CONFIG_KEYS.SETUP_COMPLETED);
    return completed === "true";
  }),

  /**
   * Get environment variables for auto-fill (read-only, for UI convenience)
   */
  getEnvConfig: adminProcedure.query(async () => {
    return {
      n8nApiUrl: process.env.N8N_API_URL || "",
      n8nApiKey: process.env.N8N_API_KEY ? "***" : "", // Mask for security
      n8nTemplateWorkflowId: process.env.N8N_TEMPLATE_WORKFLOW_ID || "",
      stripeSecretKey: process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY ? "***" : "",
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? "***" : "",
      // Check if env vars are set (for auto-complete)
      hasN8nEnv: !!(process.env.N8N_API_URL && process.env.N8N_API_KEY && process.env.N8N_TEMPLATE_WORKFLOW_ID),
      hasStripeEnv: !!(process.env.STRIPE_SANDBOX_SECRET_KEY || process.env.STRIPE_SECRET_KEY) && !!process.env.STRIPE_WEBHOOK_SECRET,
    };
  }),
});
