/**
 * Script para Executar Migração do Banco de Dados
 * 
 * Este script executa os SQLs de migração diretamente via código
 * 
 * Execução:
 *   tsx scripts/run-migration.ts
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  console.log("🚀 Iniciando migração do banco de dados...\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available. Verifique DATABASE_URL no .env");
  }

  try {
    // PASSO 1: Executar migração do schema
    console.log("📋 PASSO 1: Executando migração do schema...");
    const schemaSQL = readFileSync(join(__dirname, "migrate-database.sql"), "utf-8");
    
    // Dividir por comandos (separados por ;)
    const schemaCommands = schemaSQL
      .split(";")
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith("--") && !cmd.startsWith("/*"));

    for (const command of schemaCommands) {
      if (command.trim().length === 0) continue;
      try {
        await db.execute(command);
      } catch (error: any) {
        // Ignorar erros de "já existe" (idempotente)
        if (error.message?.includes("already exists") || 
            error.message?.includes("does not exist") ||
            error.message?.includes("duplicate")) {
          console.log(`  ⚠️  ${error.message.split("\n")[0]}`);
        } else {
          throw error;
        }
      }
    }
    console.log("✅ Migração do schema concluída!\n");

    // PASSO 2: Executar migração de dados
    console.log("📋 PASSO 2: Executando migração de dados...");
    const dataSQL = readFileSync(join(__dirname, "migrate-data.sql"), "utf-8");
    
    const dataCommands = dataSQL
      .split(";")
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith("--") && !cmd.startsWith("/*"));

    for (const command of dataCommands) {
      if (command.trim().length === 0) continue;
      try {
        await db.execute(command);
      } catch (error: any) {
        // Ignorar erros de "já existe" (idempotente)
        if (error.message?.includes("already exists") || 
            error.message?.includes("does not exist") ||
            error.message?.includes("duplicate")) {
          console.log(`  ⚠️  ${error.message.split("\n")[0]}`);
        } else {
          throw error;
        }
      }
    }
    console.log("✅ Migração de dados concluída!\n");

    // PASSO 3: Verificação
    console.log("📋 PASSO 3: Verificando migração...");
    
    const agentsCount = await db.execute("SELECT COUNT(*) as count FROM agents");
    const configsCount = await db.execute("SELECT COUNT(*) as count FROM agentConfigs WHERE \"agentId\" IS NOT NULL");
    
    console.log(`  ✅ Agents criados: ${agentsCount[0]?.count || 0}`);
    console.log(`  ✅ AgentConfigs vinculados: ${configsCount[0]?.count || 0}`);
    
    console.log("\n🎉 Migração concluída com sucesso!");
    console.log("\n📝 Próximos passos:");
    console.log("   1. Atualizar código backend");
    console.log("   2. Atualizar frontend");
    console.log("   3. Testar criação de novos agentes");

  } catch (error: any) {
    console.error("\n❌ Erro durante migração:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

// Executar migração
runMigration()
  .then(() => {
    console.log("\n✅ Processo finalizado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Erro fatal:", error);
    process.exit(1);
  });

