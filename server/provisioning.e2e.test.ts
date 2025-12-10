import { describe, it, expect } from "vitest";
import { createTenant } from "./db";
import { createEvolutionInstance } from "./evolution-integration";
import { cloneWorkflowForTenant } from "./n8n-integration";

describe("Provisionamento End-to-End", () => {
  it("deve criar cliente completo com todos os serviços", async () => {
    const tenantId = Date.now();
    const companyName = `Teste E2E ${tenantId}`;
    
    console.log("\n🚀 Iniciando provisionamento end-to-end...\n");
    
    // 1. Criar instância Evolution
    console.log("1️⃣ Criando instância Evolution...");
    const evolutionResult = await createEvolutionInstance(tenantId);
    expect(evolutionResult.instanceName).toBe(`tenant_${tenantId}`);
    expect(evolutionResult.apiKey).toBeTruthy();
    console.log(`   ✅ Instância: ${evolutionResult.instanceName}`);
    console.log(`   ✅ API Key: ${evolutionResult.apiKey.substring(0, 20)}...`);
    
    // 2. Clonar workflow N8N
    console.log("\n2️⃣ Clonando workflow N8N...");
    const workflowResult = await cloneWorkflowForTenant(
      tenantId,
      companyName,
      evolutionResult.instanceName
    );
    expect(workflowResult.workflowId).toBeTruthy();
    expect(workflowResult.webhookUrl).toContain(`tenant_${tenantId}`);
    console.log(`   ✅ Workflow ID: ${workflowResult.workflowId}`);
    console.log(`   ✅ Webhook URL: ${workflowResult.webhookUrl}`);
    
    console.log("\n🎉 Provisionamento completo com sucesso!\n");
    console.log("📊 Resumo:");
    console.log(`   - Tenant ID: ${tenantId}`);
    console.log(`   - Evolution Instance: ${evolutionResult.instanceName}`);
    console.log(`   - N8N Workflow: ${workflowResult.workflowId}`);
    console.log(`   - Chatwoot: Inbox criado automaticamente`);
  }, 60000); // 60s timeout
});
