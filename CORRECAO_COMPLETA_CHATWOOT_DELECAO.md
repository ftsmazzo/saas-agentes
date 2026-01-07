# 🔧 Correção Completa: Chatwoot e Deleção

## ❌ Problemas Identificados

1. **Chatwoot - Agent Bot e Webhook não criados:**
   - Dependia do N8N workflow (`N8N_CREATE_WEBHOOK_WORKFLOW_URL`)
   - Falhava silenciosamente sem criar webhook
   - Agent Bot criado mas não conectado corretamente

2. **Deleção de Tenant não apagava tudo:**
   - Tentava deletar webhook com formato antigo `tenant_${tenantId}`
   - Não deletava webhooks com formato novo `tenant_${tenantId}/agent_${agentId}`
   - Não deletava webhooks de todos os agentes

3. **Deleção de Agent não deletava webhook:**
   - Não deletava webhook do Chatwoot ao deletar agente

## ✅ Correções Implementadas

### 1. Criação de Webhook no Chatwoot

**Antes:**
- Dependia do N8N workflow
- Falhava silenciosamente

**Agora:**
- ✅ Cria webhook **diretamente via API do Chatwoot**
- ✅ Função `createChatwootWebhook()` criada
- ✅ Verifica se webhook já existe antes de criar
- ✅ Logs detalhados para debug
- ✅ Não falha silenciosamente

**Código:**
```typescript
// Criar webhook no Chatwoot DIRETAMENTE via API (não depender do N8N)
const webhookName = `Webhook ${companyName} - Agente ${agent.id}`;
const webhookId = await createChatwootWebhook(agentWebhookUrl, webhookName);
```

### 2. Agent Bot e Conexão

**Garantias:**
- ✅ Agent Bot criado com nome correto
- ✅ Agent Bot salvo no tenant
- ✅ Agent Bot conectado ao inbox
- ✅ Logs detalhados em cada etapa

### 3. Deleção de Tenant

**Antes:**
- Deletava apenas webhook formato antigo: `tenant_${tenantId}`

**Agora:**
- ✅ Deleta webhook de **cada agente** (formato novo): `tenant_${tenantId}/agent_${agentId}`
- ✅ Deleta webhook formato antigo (compatibilidade)
- ✅ Deleta Agent Bot do Chatwoot
- ✅ Deleta todos os recursos de cada agente

**Código:**
```typescript
// Deletar webhook de cada agente (formato padronizado)
for (const agent of agents) {
  const agentWebhookUrl = `${n8nApiUrl}/webhook/tenant_${tenant.id}/agent_${agent.id}`;
  await deleteChatwootWebhookByUrl(agentWebhookUrl);
}
```

### 4. Deleção de Agent

**Antes:**
- Não deletava webhook do Chatwoot

**Agora:**
- ✅ Deleta webhook do Chatwoot com formato correto
- ✅ Desconecta Agent Bot do inbox
- ✅ Deleta inbox do Chatwoot
- ✅ Deleta Evolution instance
- ✅ Deleta workflow N8N

**Código:**
```typescript
// Deletar webhook do Chatwoot (formato padronizado)
const agentWebhookUrl = `${n8nApiUrl}/webhook/tenant_${agent.tenantId}/agent_${agent.id}`;
await deleteChatwootWebhookByUrl(agentWebhookUrl);
```

## 📋 Fluxo Completo de Provisionamento

```
1. Criar Tenant
2. Criar Agente
3. Criar Evolution (agent_${agentId})
4. Criar Workflow N8N (webhook: tenant_${tenantId}/agent_${agentId})
5. Criar Agent Bot no Chatwoot
6. Conectar Agent Bot ao inbox
7. Criar Webhook no Chatwoot (diretamente via API)
8. ✅ Tudo funcionando!
```

## 📋 Fluxo Completo de Deleção

### Deleção de Agent:
```
1. Deletar workflow N8N
2. Deletar Evolution instance
3. Desconectar Agent Bot do inbox
4. Deletar webhook do Chatwoot (tenant_${tenantId}/agent_${agentId})
5. Deletar inbox do Chatwoot
6. Deletar do banco de dados
```

### Deleção de Tenant:
```
1. Para cada agente:
   - Deletar workflow N8N
   - Deletar Evolution instance
   - Deletar inbox do Chatwoot
   - Deletar webhook do Chatwoot (tenant_${tenantId}/agent_${agentId})
2. Deletar Agent Bot do Chatwoot
3. Deletar webhook formato antigo (compatibilidade)
4. Deletar do banco de dados
```

## ✅ Resultado Esperado

### Após Provisionamento:
- ✅ **1 Evolution:** `agent_${agentId}`
- ✅ **1 Workflow N8N:** com webhook `tenant_${tenantId}/agent_${agentId}`
- ✅ **1 Agent Bot no Chatwoot:** criado e conectado ao inbox
- ✅ **1 Webhook no Chatwoot:** criado diretamente via API, apontando para `tenant_${tenantId}/agent_${agentId}`
- ✅ **Tudo funcionando e conectado!**

### Após Deleção:
- ✅ **Todos os recursos externos deletados**
- ✅ **Nenhum webhook órfão no Chatwoot**
- ✅ **Nenhum workflow órfão no N8N**
- ✅ **Nenhuma instância órfã no Evolution**
- ✅ **Banco de dados limpo**

## 🔍 Logs para Verificação

### Provisionamento:
```
[Provisioning] ✅ Agent Bot criado: ID=X, Token=SIM
[Provisioning] ✅ Agent Bot salvo no tenant Y
[Provisioning] ✅ Agent Bot conectado ao inbox Z
[Provisioning] ✅ Webhook criado no Chatwoot diretamente: ID=W, URL=.../tenant_Y/agent_X
```

### Deleção:
```
[Delete] ✅ Webhook Chatwoot ".../tenant_Y/agent_X" deletado (agente X)
[Delete] ✅ Agent Bot "..." deletado
[Delete] ✅ Inbox Chatwoot X deletado
[Delete] ✅ Workflow N8N X deletado
[Delete] ✅ Instância Evolution X deletada
```

## ⚠️ Importante

- **Webhook agora é criado diretamente via API do Chatwoot** (não depende mais do N8N workflow)
- **Deleção agora remove todos os recursos** (webhooks, agent bots, inboxes, workflows, evolution)
- **Formato padronizado usado em todos os lugares:** `tenant_${tenantId}/agent_${agentId}`
- **Logs detalhados** para facilitar debug

