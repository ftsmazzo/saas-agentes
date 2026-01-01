import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Em produção, o código está em dist/index.js, então precisamos usar process.cwd()
  // ou caminho relativo ao diretório de trabalho
  // O Dockerfile copia dist/ para /app/dist, então dist/public está em /app/dist/public
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  console.log(`[Static] Tentando servir de: ${distPath}`);
  console.log(`[Static] process.cwd(): ${process.cwd()}`);
  console.log(`[Static] import.meta.dirname: ${import.meta.dirname}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `❌ Could not find the build directory: ${distPath}, make sure to build the client first`
    );
    console.error(`[Static] Tentando caminhos alternativos...`);
    
    // Tentar caminhos alternativos
    const altPaths = [
      path.resolve(import.meta.dirname, "public"),
      path.resolve(import.meta.dirname, "..", "public"),
      path.resolve(process.cwd(), "public"),
    ];
    
    for (const altPath of altPaths) {
      if (fs.existsSync(altPath)) {
        console.log(`✅ Encontrado em: ${altPath}`);
        return serveFromPath(app, altPath);
      }
    }
    
    // Se não encontrou, pelo menos não crashar
    console.error(`❌ Nenhum diretório de build encontrado!`);
    return;
  }
  
  serveFromPath(app, distPath);
}

function serveFromPath(app: Express, distPath: string) {

  // Servir arquivos estáticos com headers de cache apropriados
  app.use(express.static(distPath, {
    // Cache assets por 1 ano (eles têm hash no nome)
    maxAge: "1y",
    // Mas sempre validar index.html (sem cache)
    etag: true,
    lastModified: true,
  }));

  // fall through to index.html if the file doesn't exist
  // IMPORTANTE: Sempre servir index.html sem cache para garantir atualizações
  // CRÍTICO: Não capturar rotas de API - elas devem ser processadas antes
  app.use("*", (req, res, next) => {
    // Se for rota de API, não processar aqui - deixar passar para as rotas de API
    if (req.originalUrl.startsWith("/api/")) {
      return next();
    }
    
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html não encontrado em: ${indexPath}`);
      res.status(404).send("Frontend não encontrado. Verifique o build.");
      return;
    }
    
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(indexPath);
  });
}
