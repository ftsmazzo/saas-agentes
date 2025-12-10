import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

// Usar __dirname para compatibilidade com build
const rootDir = typeof __dirname !== 'undefined' ? __dirname : (import.meta.dirname || process.cwd());
const clientDir = path.resolve(rootDir, "client");

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(clientDir, "src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@assets": path.resolve(rootDir, "attached_assets"),
    },
  },
  envDir: rootDir,
  root: clientDir,
  publicDir: path.resolve(clientDir, "public"),
  build: {
    outDir: path.resolve(rootDir, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(clientDir, "index.html"),
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
