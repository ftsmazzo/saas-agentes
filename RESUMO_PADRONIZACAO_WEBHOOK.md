# 📋 Resumo: Padronização de Webhooks

## 🎯 Problema Resolvido

**Antes (bagunça):**
- Chatwoot: `/webhook/agent_14`
- N8N: `/webhook/tenant_52`
- Evolution: `tenant_52`
- ❌ Tudo desalinhado, agente não ativava

**Agora (padronizado):**
- ✅ Todos usam: `/webhook/tenant_${tenantId}/agent_${agentId}`
- ✅ Evolution: `agent_${agentId}`
- ✅ Tudo alinhado e funcionando

## ✅ Mudanças Implementadas

### 1. Rota do Webhook Handler
- **Nova rota principal:** `/api/webhooks/n8n/tenant/:tenantId/agent/:agentId`
- **Rotas de compatibilidade:** `/api/webhooks/n8n/:identifier` (aceita `agent_X` ou `tenant_X`)
- Validação de segurança: verifica que o agente pertence ao tenant

### 2. N8N Integration (`cloneWorkflowForTenant`)
- Cria webhook no formato: `tenant_${tenantId}/agent_${agentId}`
- Passa `agentId` para criar webhook padronizado

### 3. Agent Activation (`agent.activate`)
- Usa formato padronizado: `tenant_${tenantId}/agent_${agentId}`
- Cria webhook no Chatwoot com formato correto

### 4. Provisioning (`provisionTenantFromCheckout`)
- Cria Evolution com nome correto: `agent_${agentId}` (não mais `tenant_${tenantId}`)
- Deleta Evolution temporário se criado com nome errado
- Recria workflow N8N com webhook padronizado
- Cria Agent Bot e webhook no Chatwoot com formato correto

### 5. Evolution Instance
- Sempre usa: `agent_${agentId}` (não mais `tenant_${tenantId}`)
- Consistente em todos os lugares

## 🔧 O Que Precisa Ser Feito no N8N

### 1. Atualizar Filtro de Segurança

**Node:** `Filter` (início do workflow)

**Atualizar para:**
```json
{
  "conditions": [
    {
      "leftValue": "={{ $('Edit Fields2').item.json.agentId }}",
      "rightValue": "={{ $('Select rows from a table').item.json.id }}",
      "operator": "equals"
    },
    {
      "leftValue": "={{ $('Edit Fields2').item.json.tenantId }}",
      "rightValue": "={{ $('Select rows from a table').item.json.tenantId }}",
      "operator": "equals"
    }
  ],
  "combinator": "and"
}
```

### 2. Atualizar "Edit Fields2"

**Adicionar campos:**
- `webhookPath`: `={{$json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() }}`
- `tenantId`: `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/')[0].replace(/^tenant_/i, '')) || null : null}}`
- `agentId`: `={{$json.webhookUrl ? parseInt(($json.webhookUrl.split('/webhook/')[1] || $json.webhookUrl.split('/').pop() || '').split('/').pop().replace(/^agent_/i, '')) || null : null}}`

### 3. Atualizar "Select rows from a table"

- **Table:** `agents` (não mais `tenants`)
- **Where:** `id = {{ $json.agentId }}`

### 4. Atualizar Webhook URL no Workflow

Se houver referências hardcoded ao webhook, atualizar para:
`https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/tenant_${tenantId}/agent_${agentId}`

## 📝 Documentação Atualizada

- `CORRECAO_FILTRO_WEBHOOK_N8N.md` - Guia completo para atualizar o filtro
- `VALIDACAO_SEGURANCA_WEBHOOK.md` - Validações de segurança implementadas

## ✅ Benefícios

1. **Segurança:** Validação dupla (tenantId + agentId) previne cross-tenant attacks
2. **Clareza:** Formato padronizado facilita identificação e debug
3. **Consistência:** Todos os sistemas usam o mesmo formato
4. **Compatibilidade:** Formatos antigos ainda funcionam (migração gradual)

## 🔄 Compatibilidade

O sistema mantém compatibilidade com:
- `/webhook/tenant_${tenantId}` (formato antigo)
- `/webhook/agent_${agentId}` (formato intermediário)
- `/webhook/tenant_${tenantId}/agent_${agentId}` (formato padronizado - NOVO)

## ⚠️ Importante

**Após deploy, atualizar o workflow N8N seguindo o guia em `CORRECAO_FILTRO_WEBHOOK_N8N.md`**

Sem essa atualização, o filtro de segurança não funcionará corretamente e pode bloquear mensagens legítimas.

