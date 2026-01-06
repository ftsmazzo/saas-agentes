# 🔧 Plano de Correção Sistemática - Restaurar Funcionalidade

## 🚨 PROBLEMA IDENTIFICADO

O sistema foi refatorado para usar `agents` em vez de `tenant` diretamente, mas:
1. ❌ **Provisionamento automático NÃO cria agentes** - salva dados em `tenants` mas sistema busca em `agents`
2. ❌ **QR Code não funciona** - precisa de `agent.evolutionInstanceName` mas agente não existe
3. ❌ **Criação automática quebrada** - fluxo de provisionamento incompleto

---

## 📋 FASE 1: CORRIGIR PROVISIONAMENTO AUTOMÁTICO (CRÍTICO)

### 1.1 Corrigir Webhook Stripe
**Arquivo:** `server/webhooks/stripe.ts`

**Problema:** 
- Linha 184-191: Salva `evolutionInstanceName`, `n8nWorkflowId`, `chatwootInboxId` diretamente em `tenants`
- Sistema agora busca esses dados em `agents`
- **NÃO cria agente automaticamente**

**Solução:**
1. Após criar tenant e provisionar recursos (Evolution, N8N, Chatwoot)
2. **CRIAR AGENTE automaticamente** com todos os dados
3. Remover salvamento direto em `tenants` (ou manter como backup)

**Código a adicionar após linha 223:**
```typescript
// 7. Criar agente automaticamente para o tenant
if (evolutionData?.instanceName) {
  try {
    const agent = await db.createAgent({
      tenantId: tenant.id,
      name: companyName || `Agente ${tenant.id}`,
      evolutionInstanceName: evolutionData.instanceName,
      n8nWorkflowId: workflowData?.workflowId || null,
      chatwootInboxId: chatwootInboxId || null,
      chatwootAgentId: chatwootAgentId || null,
      isActive: false, // Cliente ainda não ativou
    });
    console.log(`[Provisioning] ✅ Agente criado automaticamente: ID=${agent.id}`);
  } catch (error: any) {
    console.error(`[Provisioning] Erro ao criar agente:`, error);
    // Não falhar provisionamento, mas logar erro
  }
}
```

---

## 📋 FASE 2: CORRIGIR ROTAS QUEBRADAS

### 2.1 Verificar todas as rotas que usam `tenant.n8nWorkflowId/evolutionInstanceName/chatwootInboxId`

**Arquivo:** `server/routers.ts`

**Buscar e corrigir:**
- `tenant.n8nWorkflowId` → `agent.n8nWorkflowId` (usar `getTenantAgent()`)
- `tenant.evolutionInstanceName` → `agent.evolutionInstanceName`
- `tenant.chatwootInboxId` → `agent.chatwootInboxId`

**Rotas críticas a verificar:**
1. ✅ `getQRCode` - JÁ CORRIGIDO (usa `agent`)
2. ⏳ `getWhatsAppStatus` - Verificar
3. ⏳ `disconnectWhatsApp` - Verificar
4. ⏳ `activateAgent` - Verificar
5. ⏳ `deactivateAgent` - Verificar
6. ⏳ `updateAgentConfig` - Verificar
7. ⏳ Rotas de métricas - Verificar

---

## 📋 FASE 3: CORRIGIR FRONTEND

### 3.1 WhatsAppQRCode.tsx
**Verificar:**
- Se está chamando rota correta
- Se trata erro quando agente não existe
- Se mostra mensagem clara se não houver agente

### 3.2 AgentConfigUnified.tsx
**Verificar:**
- Se cria agente se não existir
- Se atualiza agente existente
- Se salva configurações corretamente

---

## 📋 FASE 4: TESTAR FLUXO COMPLETO

### 4.1 Teste de Provisionamento
1. Criar tenant via Stripe webhook (ou admin)
2. Verificar se agente foi criado automaticamente
3. Verificar se dados estão corretos (Evolution, N8N, Chatwoot)

### 4.2 Teste de QR Code
1. Acessar página de QR Code
2. Verificar se gera QR Code corretamente
3. Conectar WhatsApp

### 4.3 Teste de Criação Manual
1. Criar agente manualmente via frontend
2. Verificar se salva corretamente
3. Verificar se aparece nas listagens

---

## 🎯 ORDEM DE EXECUÇÃO

1. **URGENTE:** FASE 1 - Corrigir provisionamento automático
2. **URGENTE:** FASE 2 - Corrigir rotas críticas (QR Code, ativação)
3. **IMPORTANTE:** FASE 3 - Corrigir frontend
4. **FINAL:** FASE 4 - Testar tudo

---

## ✅ CHECKLIST DE CORREÇÃO

### Backend
- [ ] Corrigir `provisionTenantFromCheckout` para criar agente
- [ ] Corrigir `tenants.create` para criar agente
- [ ] Verificar todas as rotas que usam `tenant.*` diretamente
- [ ] Substituir por `agent.*` usando `getTenantAgent()`

### Frontend
- [ ] Verificar `WhatsAppQRCode.tsx`
- [ ] Verificar `AgentConfigUnified.tsx`
- [ ] Verificar outras páginas que dependem de agente

### Testes
- [ ] Testar provisionamento automático
- [ ] Testar QR Code
- [ ] Testar criação manual de agente
- [ ] Testar fluxo completo

---

**Vamos começar pela FASE 1 - Correção do Provisionamento!** 🚀

