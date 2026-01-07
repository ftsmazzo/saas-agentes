# 🔧 Correção: Provisionamento Simplificado e Corrigido

## ❌ Problemas Identificados

1. **Duas instâncias Evolution criadas:**
   - Uma com `tenant_${tenantId}` (temporária)
   - Outra com `agent_${agentId}` (correta)
   - Resultado: Duplicação e confusão

2. **Webhook N8N usando formato antigo:**
   - Criado com `tenant_${tenantId}` ao invés de `tenant_${tenantId}/agent_${agentId}`
   - Workflow criado antes do agente, sem `agentId`

3. **Webhook no Chatwoot não criado:**
   - Lógica complexa e duplicada
   - Código mal estruturado com blocos aninhados incorretamente

## ✅ Solução Implementada

### Fluxo Simplificado e Correto:

1. **Criar Agente PRIMEIRO**
   ```typescript
   const agent = await createAgent({
     tenantId: tenant.id,
     name: companyName,
     // evolutionInstanceName: null (será criado depois)
     // n8nWorkflowId: null (será criado depois)
   });
   ```

2. **Criar Evolution com nome correto: `agent_${agentId}`**
   ```typescript
   const evolutionInstanceName = `agent_${agentId}`;
   // Criar Evolution diretamente com nome correto
   // Atualizar agente com evolutionInstanceName e evolutionApiKey
   ```

3. **Criar Workflow N8N com webhook padronizado**
   ```typescript
   workflowData = await cloneWorkflowForTenant(
     tenant.id,
     companyName,
     evolutionData.instanceName, // agent_${agentId}
     agent.id, // Passar agentId para criar webhook padronizado
     companyName
   );
   // Webhook criado: tenant_${tenantId}/agent_${agentId}
   ```

4. **Criar Agent Bot e Webhook no Chatwoot**
   ```typescript
   const agentWebhookUrl = `${n8nApiUrl}/webhook/tenant_${tenant.id}/agent_${agent.id}`;
   // Criar Agent Bot
   // Conectar ao inbox
   // Criar webhook via N8N workflow
   ```

## 📋 Ordem de Execução Corrigida

```
1. Criar Tenant
2. Criar Agente (sem Evolution ainda)
3. Criar Evolution com agent_${agentId}
4. Atualizar Agente com Evolution
5. Criar Workflow N8N com webhook padronizado
6. Atualizar Agente com Workflow
7. Criar Agent Bot no Chatwoot
8. Criar Webhook no Chatwoot
9. Gerar token de ativação
10. Atribuir créditos mensais
```

## ✅ Resultado Esperado

Após o provisionamento:
- ✅ **1 instância Evolution:** `agent_${agentId}`
- ✅ **1 workflow N8N:** com webhook `tenant_${tenantId}/agent_${agentId}`
- ✅ **1 Agent Bot no Chatwoot:** conectado ao inbox
- ✅ **1 Webhook no Chatwoot:** apontando para `tenant_${tenantId}/agent_${agentId}`
- ✅ **Tudo alinhado e funcionando**

## 🔍 Verificação

Após deploy, verificar nos logs:
1. `[Provisioning] ✅ Agente criado: ID=X`
2. `[Provisioning] ✅ Evolution criado: agent_X`
3. `[Provisioning] ✅ Workflow N8N criado: Y, Webhook: .../tenant_Z/agent_X`
4. `[Provisioning] ✅ Agent Bot criado: ID=...`
5. `[Provisioning] ✅ Webhook criado no Chatwoot: .../tenant_Z/agent_X`

## ⚠️ Importante

- **Não há mais criação temporária de Evolution**
- **Não há mais recriação de workflow**
- **Tudo é criado na ordem correta, uma única vez**
- **Formato padronizado usado em todos os lugares**

