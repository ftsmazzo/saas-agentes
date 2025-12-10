import { describe, it, expect } from "vitest";
import { createEvolutionInstance, generateQRCode, getConnectionStatus } from "./evolution-integration";
import { cloneWorkflowForTenant } from "./n8n-integration";

describe("Provisionamento Completo de Tenant", () => {
  it("deve criar instância Evolution API", async () => {
    const tenantId = Date.now(); // ID único baseado em timestamp
    
    const result = await createEvolutionInstance(tenantId);
    
    expect(result).toBeDefined();
    expect(result.instanceName).toBe(`tenant_${tenantId}`);
    expect(result.apiKey).toBeTruthy();
    
    console.log("✅ Instância Evolution criada:", result);
  }, 30000); // 30s timeout

  it("deve gerar QR Code para conexão WhatsApp", async () => {
    const instanceName = "tenant_999";
    
    const qrCode = await generateQRCode(instanceName);
    
    expect(qrCode).toBeTruthy();
    expect(qrCode).toContain("data:image");
    
    console.log("✅ QR Code gerado com sucesso (base64)");
  }, 30000);

  it("deve verificar status de conexão", async () => {
    const instanceName = "tenant_999";
    
    const status = await getConnectionStatus(instanceName);
    
    expect(status).toBeDefined();
    expect(["open", "close", "connecting"]).toContain(status);
    
    console.log("✅ Status da conexão:", status);
  }, 30000);

  it("deve clonar workflow N8N com configurações do tenant", async () => {
    const tenantId = 999;
    const tenantName = "Teste Imobiliária";
    const evolutionInstanceName = "tenant_999";
    
    const result = await cloneWorkflowForTenant(
      tenantId,
      tenantName,
      evolutionInstanceName
    );
    
    expect(result).toBeDefined();
    expect(result.workflowId).toBeTruthy();
    expect(result.webhookUrl).toContain(`tenant_${tenantId}`);
    
    console.log("✅ Workflow N8N clonado:", result);
  }, 30000);
});
