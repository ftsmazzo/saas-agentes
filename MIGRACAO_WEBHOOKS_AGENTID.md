# Migração de Webhooks: tenantId → agentId

## 🎯 Problema Identificado

O sistema estava usando `tenantId` para criar webhooks e instâncias do Evolution, mas agora que temos **múltiplos agentes por tenant**, precisamos usar `agentId` para diferenciar cada agente.

### Problemas Encontrados:
- Webhooks do N8N criados como `/webhook/tenant_51` (não diferencia agentes)
- Instâncias do Evolution nomeadas como `tenant_51` (não diferencia agentes)
- Webhooks no Chatwoot usando `tenantId` (não diferencia agentes)

## ✅ Solução Implementada

### 1. Webhooks do N8N
- **Antes**: `/webhook/tenant_${tenantId}`
- **Agora**: `/webhook/agent_${agentId}`

### 2. Instâncias do Evolution
- **Antes**: `tenant_${tenantId}`
- **Agora**: `agent_${agentId}` (já implementado em `createAgent`)

### 3. Webhook Handler
- **Rota atualizada**: `/api/webhooks/n8n/:identifier`
- **Aceita**: `agent_${agentId}` (novo) ou `tenant_${tenantId}` (compatibilidade)
- **Identifica automaticamente**: Se for `agent_`, busca o agente e usa seu `tenantId`

## 📝 Mudanças no Código

### `server/n8n-integration.ts`
- `cloneWorkflowForTenant` agora aceita `agentId` opcional
- Cria webhook path como `agent_${agentId}` quando disponível
- Mantém compatibilidade com `tenantId` quando `agentId` não fornecido

### `server/webhooks/n8n.ts`
- Handler atualizado para identificar `agent_${agentId}` ou `tenant_${tenantId}`
- Busca o agente automaticamente quando recebe `agent_${agentId}`
- Usa `agentId` no registro de uso de créditos

### `server/routers.ts`
- `agent.activate` agora cria webhook com `agent_${agentId}`
- `agent.createAgent` passa `agentId` para `cloneWorkflowForTenant`
- Webhook URL usa `agent_${agentId}` em vez de `tenant_${tenantId}`

### `server/webhooks/stripe.ts`
- `provisionTenantFromCheckout` usa `agent_${agentId}` no webhook após criar o agente
- Inclui `agentId` no payload do workflow de criação de webhook

### `server/_core/index.ts`
- Rota atualizada para aceitar `:identifier` (genérico)
- Suporta tanto `agent_${agentId}` quanto `tenant_${tenantId}`

## 🔄 Compatibilidade

O sistema mantém **compatibilidade retroativa**:
- Webhooks antigos com `tenant_${tenantId}` ainda funcionam
- O handler identifica automaticamente o formato e processa corretamente
- Agentes antigos continuam funcionando até serem atualizados

## 🚀 Próximos Passos

### Para Novos Agentes
✅ **Já funciona automaticamente** - Novos agentes criados usam `agent_${agentId}`

### Para Agentes Existentes
1. **Opção 1 (Recomendada)**: Deletar e recriar os agentes
   - Isso criará novos webhooks com `agent_${agentId}`
   - Workflows serão recriados com o path correto

2. **Opção 2**: Atualizar manualmente os workflows no N8N
   - Editar o node Webhook no workflow
   - Mudar path de `tenant_${tenantId}` para `agent_${agentId}`
   - Atualizar webhook no Chatwoot para usar a nova URL

3. **Opção 3**: Script de migração (futuro)
   - Criar script que atualiza todos os workflows existentes
   - Atualiza webhooks no Chatwoot automaticamente

## ⚠️ Importante

- **Webhooks antigos continuam funcionando** (compatibilidade)
- **Novos agentes usam `agent_${agentId}` automaticamente**
- **Não é necessário migrar imediatamente** - sistema funciona com ambos os formatos
- **Recomendado migrar** quando possível para evitar confusão

## 📋 Checklist de Migração (Opcional)

Para cada agente existente:
- [ ] Verificar webhook atual no Chatwoot
- [ ] Verificar path do webhook no workflow N8N
- [ ] Atualizar workflow N8N para usar `agent_${agentId}`
- [ ] Atualizar webhook no Chatwoot para nova URL
- [ ] Testar recebimento de mensagens
- [ ] Verificar logs do webhook handler

## 🔍 Como Verificar

### Verificar Webhook no N8N:
1. Acessar workflow no N8N
2. Abrir node "Webhook"
3. Verificar campo "Path"
4. Deve ser `agent_${agentId}` para novos agentes

### Verificar Webhook no Chatwoot:
1. Acessar Chatwoot → Settings → Integrations → Webhooks
2. Verificar URL do webhook
3. Deve ser `https://...n8n.../webhook/agent_${agentId}` para novos agentes

### Verificar Logs:
```bash
# Procurar por logs do webhook handler
grep "N8N Webhook" logs.txt | grep "agent_"
```

## 📚 Referências

- `server/n8n-integration.ts` - Função `cloneWorkflowForTenant`
- `server/webhooks/n8n.ts` - Handler de webhook
- `server/routers.ts` - Rotas `agent.activate` e `agent.createAgent`
- `server/webhooks/stripe.ts` - Provisionamento inicial

