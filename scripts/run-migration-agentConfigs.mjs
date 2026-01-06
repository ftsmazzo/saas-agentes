import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function runMigration() {
  try {
    console.log('🔄 Executando migration: agentConfigs tenantId → agentId...');
    
    const migrationPath = join(__dirname, '..', 'drizzle', '0013_migrate_agentConfigs_to_agentId.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Executar migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Tabela agentConfigs agora usa agentId em vez de tenantId');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

