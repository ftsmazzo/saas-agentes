/**
 * Script de Migração: agentConfigs → agents + agentConfigs
 * 
 * Este script migra a estrutura antiga (1 agente por tenant via agentConfigs.tenantId)
 * para a nova estrutura (múltiplos agentes via agents + agentConfigs.agentId)
 * 
 * Execução:
 *   tsx scripts/migrate-to-agents.ts
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { agents, agentConfigs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function migrateToAgents() {
  console.log("🚀 Iniciando migração para nova estrutura de agentes...\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  try {
    // 1. Buscar todos os agentConfigs existentes (estrutura antiga)
    // ANTES da migração do Drizzle, agentConfigs ainda tem tenantId (não agentId)
    // Vamos usar SQL direto para buscar todos os configs com seus tenants
    const result = await db.execute(`
      SELECT 
        ac.id as "configId",
        ac."tenantId",
        ac."systemPrompt",
        ac."companyInfo",
        ac."welcomeMessage",
        ac."enableHumanHandoff",
        ac."enableAudioTranscription",
        ac."enableImageProcessing",
        ac."openaiModel",
        ac."toolsConfig",
        ac."schedulingConfig",
        ac."ragConfig",
        t."companyName",
        t."n8nWorkflowId",
        t."evolutionInstanceName",
        t."evolutionApiKey",
        t."chatwootInboxId"
      FROM "agentConfigs" ac
      INNER JOIN "tenants" t ON ac."tenantId" = t.id
    `);

    console.log(`📊 Encontrados ${result.length} agentConfigs para migrar\n`);

    if (result.length === 0) {
      console.log("✅ Nenhuma migração necessária. Estrutura já está atualizada.");
      return;
    }

    // 2. Para cada config antiga, criar um agent e atualizar o config
    for (const oldConfig of result) {
      const tenantId = oldConfig.tenantId;
      const companyName = oldConfig.companyName || "Cliente";
      const configId = oldConfig.configId;
      
      console.log(`🔄 Migrando agente para tenant ${tenantId} (${companyName})...`);

      // Criar novo agent
      // Nome padrão: usar companyName (usuário pode editar depois)
      const agentName = `${companyName} - Agente`;
      
      // Migrar integrações do tenant para o agent (se existirem)
      const [newAgent] = await db
        .insert(agents)
        .values({
          tenantId: tenantId,
          name: agentName,
          description: `Agente migrado automaticamente de ${companyName}`,
          status: "active",
          isActive: true,
          // Migrar integrações do tenant para o agent
          n8nWorkflowId: oldConfig.n8nWorkflowId || null,
          evolutionInstanceName: oldConfig.evolutionInstanceName || null,
          evolutionApiKey: oldConfig.evolutionApiKey || null,
          chatwootInboxId: oldConfig.chatwootInboxId || null,
        })
        .returning();

      console.log(`  ✅ Agent criado: ID ${newAgent.id}, Nome: "${agentName}"`);

      // Atualizar agentConfig para referenciar o novo agent
      // NOTA: Isso só funcionará DEPOIS da migração do Drizzle que adiciona a coluna agentId
      // Por enquanto, vamos apenas criar o agent e deixar o config para depois
      try {
        await db.execute(`
          UPDATE "agentConfigs"
          SET "agentId" = ${newAgent.id}
          WHERE id = ${configId}
        `);
        console.log(`  ✅ AgentConfig atualizado para referenciar agent ${newAgent.id}`);
      } catch (error: any) {
        // Se a coluna agentId ainda não existe, apenas logar
        if (error.message?.includes('column "agentId" does not exist')) {
          console.log(`  ⚠️ Coluna agentId ainda não existe - será atualizada após migração do Drizzle`);
        } else {
          throw error;
        }
      }

      console.log(``);
    }

    console.log("✅ Migração concluída com sucesso!");
    console.log("\n📝 Próximos passos:");
    console.log("   1. Execute a migração do Drizzle: pnpm db:push");
    console.log("   2. Execute este script novamente para atualizar agentConfigs.agentId");
    console.log("   3. Os usuários podem editar o nome dos agentes na interface");
    console.log("   4. As integrações foram migradas do tenant para o agent");

  } catch (error) {
    console.error("❌ Erro durante migração:", error);
    throw error;
  }
}

// Executar migração
migrateToAgents()
  .then(() => {
    console.log("\n🎉 Migração finalizada!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Erro fatal:", error);
    process.exit(1);
  });

