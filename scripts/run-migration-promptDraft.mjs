/**
 * Script para Executar Migration: Adicionar promptDraft à tabela assistantConversations
 * 
 * Execução:
 *   node scripts/run-migration-promptDraft.mjs
 */

import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log("🚀 Iniciando migração: Adicionar promptDraft à assistantConversations...\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não encontrada no .env");
  }

  const sql = postgres(databaseUrl);

  try {
    // Ler o arquivo de migration
    const migrationSQL = readFileSync(
      join(__dirname, "../drizzle/0017_add_promptDraft_to_assistantConversations.sql"),
      "utf-8"
    );

    console.log("📋 Executando migration SQL...");
    await sql.unsafe(migrationSQL);
    
    console.log("✅ Migration executada com sucesso!");
    
    // Verificar se a coluna foi criada
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assistantConversations' 
      AND column_name = 'promptDraft'
    `;
    
    if (result.length > 0) {
      console.log("✅ Coluna 'promptDraft' confirmada na tabela 'assistantConversations'");
    } else {
      console.log("⚠️  Coluna 'promptDraft' não encontrada (pode ser que já exista ou houve erro)");
    }

  } catch (error) {
    console.error("\n❌ Erro durante migração:", error.message);
    
    // Se o erro for "já existe", não é crítico
    if (error.message?.includes("already exists") || 
        error.message?.includes("duplicate") ||
        error.message?.includes("does not exist")) {
      console.log("⚠️  Erro não crítico (coluna pode já existir):", error.message);
    } else {
      throw error;
    }
  } finally {
    await sql.end();
  }

  console.log("\n🎉 Processo concluído!");
}

// Executar migração
runMigration()
  .then(() => {
    console.log("\n✅ Tudo certo!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Falha na migração:", error);
    process.exit(1);
  });

