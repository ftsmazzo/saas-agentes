# 🔧 Refatoração de server/routers.ts

## 📋 FUNÇÕES HELPER CRIADAS ✅

```typescript
// Buscar primeiro agente do tenant (compatibilidade)
async function getTenantAgent(tenantId: number): Promise<db.Agent | null>

// Buscar todos os agentes do tenant
async function getTenantAgents(tenantId: number): Promise<db.Agent[]>
```

---

## 🔄 SUBSTITUIÇÕES NECESSÁRIAS

### Padrão de Substituição

**ANTES:**
```typescript
if (tenant.n8nWorkflowId) {
  await deleteWorkflow(tenant.n8nWorkflowId);
}
```

**DEPOIS:**
```typescript
const agent = await getTenantAgent(tenantId);
if (agent?.n8nWorkflowId) {
  await deleteWorkflow(agent.n8nWorkflowId);
}
```

---

## 📝 REFERÊNCIAS A ATUALIZAR (43 encontradas)

### 1. Função `deleteTenantCompletely` ✅ (JÁ ATUALIZADA)
- Linhas 66-100: Agora itera sobre agents

### 2. Função `deprovisionTenantResources` ⏳
- Linha 709: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 735: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`

### 3. Função `updateAgentConfig` ⏳
- Linha 1106: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 1110: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 1133: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`

### 4. Rotas WhatsApp ⏳
- Linha 1867: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1876: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1883: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1888: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1893: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1898: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1903: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1929: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1933: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1934: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1956: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`
- Linha 1964: `tenant.evolutionInstanceName` → `agent?.evolutionInstanceName`

### 5. Rotas de Ativação ⏳
- Linha 1994: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 2002: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 2004: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 2006: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 2007: `tenant.n8nWorkflowId` → `agent?.n8nWorkflowId`
- Linha 2072: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`
- Linha 2101: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`
- Linha 2102: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`
- Linha 2188: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`
- Linha 2230: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`
- Linha 2232: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`
- Linha 2233: `tenant.chatwootInboxId` → `agent?.chatwootInboxId`

---

## 🎯 ESTRATÉGIA DE REFATORAÇÃO

### Opção 1: Substituição Gradual (Recomendado)
1. Atualizar uma função por vez
2. Testar após cada atualização
3. Commit após cada função

### Opção 2: Substituição Completa
1. Substituir todas as referências de uma vez
2. Testar tudo junto
3. Mais rápido, mas mais arriscado

---

## ⚠️ CUIDADOS

1. **Sempre verificar se agent existe:**
   ```typescript
   const agent = await getTenantAgent(tenantId);
   if (!agent) {
     // Lidar com caso de não ter agente
     return;
   }
   ```

2. **Algumas funções podem precisar de múltiplos agentes:**
   ```typescript
   const agents = await getTenantAgents(tenantId);
   for (const agent of agents) {
     // Processar cada agente
   }
   ```

3. **Manter compatibilidade:**
   - Se não houver agente, pode criar um automaticamente
   - Ou retornar erro apropriado

---

**Vou continuar atualizando as referências!** 🚀

