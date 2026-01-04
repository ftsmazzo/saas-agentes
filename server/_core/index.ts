import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { handleStripeWebhook } from "../webhooks/stripe";
import { handleN8NWebhook } from "../webhooks/n8n";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runMonthlyCreditsReset } from "../jobs/monthly-credits-reset";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Middleware de debug para TODAS as requisições (antes de qualquer coisa)
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) {
      console.log(`[ALL REQUESTS] 🔍 ${req.method} ${req.originalUrl}`);
      console.log(`[ALL REQUESTS] 📍 Params:`, req.params);
      console.log(`[ALL REQUESTS] 🔗 Query:`, req.query);
      console.log(`[ALL REQUESTS] 📦 Body exists:`, !!req.body);
    }
    next();
  });
  
  // Health check endpoint (para Docker/EasyPanel) - REGISTRAR PRIMEIRO
  app.get("/api/health", (req, res) => {
    console.log(`[Health] ✅ Health check chamado`);
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  console.log("✅ [Routes] Health check registrado: GET /api/health");
  
  // Stripe webhook needs raw body, so register BEFORE body parser
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  
  // N8N webhook - recebe dados do workflow
  // IMPORTANTE: Registrar ANTES do body parser global para garantir que seja processado
  app.post("/api/webhooks/n8n/:tenantId", express.json({ limit: "50mb" }), (req, res, next) => {
    console.log(`[N8N Route] 🎯 ROTA CHAMADA: ${req.method} ${req.originalUrl}`);
    console.log(`[N8N Route] 📍 Params:`, req.params);
    console.log(`[N8N Route] 📦 Body recebido:`, JSON.stringify(req.body, null, 2));
    console.log(`[N8N Route] 📦 Body.data (tipo: ${typeof req.body?.data}):`, req.body?.data);
    handleN8NWebhook(req, res, next);
  });
  console.log("✅ [Routes] Rota N8N webhook registrada: POST /api/webhooks/n8n/:tenantId");
  
  // Endpoint de teste para N8N (aceita qualquer método)
  app.all("/api/webhooks/n8n/test", (req, res) => {
    console.log(`[N8N Test] 🧪 TESTE RECEBIDO: ${req.method} ${req.originalUrl}`);
    console.log(`[N8N Test] 📍 Params:`, req.params);
    console.log(`[N8N Test] 🔗 Query:`, req.query);
    console.log(`[N8N Test] 📦 Body:`, req.body);
    console.log(`[N8N Test] 📋 Headers:`, req.headers);
    res.status(200).json({ 
      success: true, 
      message: "Teste recebido com sucesso",
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  });
  console.log("✅ [Routes] Endpoint de teste N8N registrado: ALL /api/webhooks/n8n/test");
  
  // Configure body parser with larger size limit for file uploads
  // NOTA: N8N webhook já tem seu próprio body parser acima
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}/`);
    console.log(`📦 Build version: ${process.env.GIT_SHA || 'dev'}`);
    console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ SetupWizard REMOVIDO - Configurações no EasyPanel`);
    
    // Configurar job de reset mensal de créditos
    setupMonthlyCreditsResetJob();
  });
}

/**
 * Configura job de reset mensal de créditos
 * Executa no primeiro dia de cada mês às 00:00
 */
function setupMonthlyCreditsResetJob() {
  console.log(`[Monthly Credits Reset] ⏰ Job configurado para rodar no primeiro dia de cada mês às 00:00`);
  
  // Verificar se é o primeiro dia do mês e executar imediatamente se necessário
  const now = new Date();
  const isFirstDay = now.getDate() === 1;
  const isMidnight = now.getHours() === 0 && now.getMinutes() < 5; // Executar se for meia-noite (com margem de 5 min)
  
  if (isFirstDay && isMidnight) {
    console.log(`[Monthly Credits Reset] 🚀 Executando reset imediatamente (primeiro dia do mês)`);
    runMonthlyCreditsReset().catch(console.error);
  }
  
  // Agendar para o próximo primeiro dia do mês às 00:00
  scheduleNextReset();
}

/**
 * Agenda o próximo reset mensal
 */
function scheduleNextReset() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  const timeUntilNext = nextMonth.getTime() - now.getTime();
  
  // Validar timeout (máximo 32 bits signed = ~24 dias)
  const MAX_TIMEOUT = 2147483647; // 32-bit signed integer max
  const MIN_TIMEOUT = 1000; // Mínimo 1 segundo
  
  if (timeUntilNext > MAX_TIMEOUT) {
    console.error(`[Monthly Credits Reset] ❌ Timeout muito grande (${timeUntilNext}ms). Usando máximo permitido.`);
    // Se for muito grande, agendar para 24 dias (quase um mês)
    const fallbackTime = 24 * 24 * 60 * 60 * 1000; // 24 dias em ms
    setTimeout(() => {
      console.log(`[Monthly Credits Reset] 🚀 Reagendando reset...`);
      scheduleNextReset();
    }, fallbackTime);
    return;
  }
  
  if (timeUntilNext < MIN_TIMEOUT) {
    console.warn(`[Monthly Credits Reset] ⚠️ Timeout muito pequeno (${timeUntilNext}ms). Executando imediatamente.`);
    runMonthlyCreditsReset()
      .then(() => scheduleNextReset())
      .catch((error) => {
        console.error(`[Monthly Credits Reset] ❌ Erro no reset:`, error);
        // Tentar novamente em 1 hora se falhar
        setTimeout(() => scheduleNextReset(), 60 * 60 * 1000);
      });
    return;
  }
  
  console.log(`[Monthly Credits Reset] ⏰ Próximo reset agendado para: ${nextMonth.toISOString()} (em ${Math.round(timeUntilNext / 1000 / 60 / 60)} horas)`);
  
  const timeoutId = setTimeout(() => {
    console.log(`[Monthly Credits Reset] 🚀 Executando reset mensal agendado...`);
    runMonthlyCreditsReset()
      .then(() => {
        // Agendar o próximo reset após executar
        scheduleNextReset();
      })
      .catch((error) => {
        console.error(`[Monthly Credits Reset] ❌ Erro no reset agendado:`, error);
        // Tentar novamente em 1 hora se falhar
        setTimeout(() => scheduleNextReset(), 60 * 60 * 1000);
      });
  }, timeUntilNext);
  
  // Armazenar timeoutId para poder cancelar se necessário
  (global as any).monthlyResetTimeoutId = timeoutId;
}

startServer().catch(console.error);
