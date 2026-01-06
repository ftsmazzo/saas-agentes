# ✅ Confirmação da Regra de Negócio

## 🎯 REGRA CONFIRMADA

### 1. **Cliente assina (1 assinatura por tenant)** ✅
- **Status:** ✅ **IMPLEMENTADO**
- **Localização:** `tenants.stripeSubscriptionId`, `tenants.currentPlanId`
- **Validação:** Cada tenant tem uma única assinatura Stripe

### 2. **Cliente pode criar múltiplos agentes** ⚠️
- **Status:** ⚠️ **PARCIALMENTE IMPLEMENTADO**
- **Problema:** `createAgent` bloqueia criação se já existe agente (linha 1041)
- **Correção necessária:** Remover verificação que impede múltiplos agentes

### 3. **Todos os agentes compartilham créditos da conta** ✅
- **Status:** ✅ **IMPLEMENTADO CORRETAMENTE**
- **Validação:**
  - `tenantCredits` é por `tenantId` (não por `agentId`)
  - `usageTransactions` rastreia `tenantId` e `agentId` (para analytics)
  - Todas as queries de créditos usam `tenantId`
- **Conclusão:** ✅ Estrutura está correta

### 4. **Admin pode brecar todos os agentes do cliente** ✅
- **Status:** ✅ **IMPLEMENTADO**
- **Localização:** `server/routers.ts` linha ~763 - `tenants.suspend`
- **Funcionalidade:**
  - Admin pode suspender tenant
  - Ao suspender, desativa workflows de TODOS os agentes
  - Atualiza `tenant.status = 'suspended'`
  - Bloqueia acesso (verificado em `auth.ts` linha 143)
- **Rotas disponíveis:**
  - `tenants.suspend` - Suspender tenant (breca todos agentes)
  - `tenants.reactivate` - Reativar tenant (reativa todos agentes)

### 5. **Cliente pode apagar agentes individuais** ⚠️
- **Status:** ⚠️ **PARCIALMENTE IMPLEMENTADO**
- **Problemas:**
  - `deleteAgent()` existe mas não limpa recursos externos
  - Não há rota no `clientPanel` para deletar agente
  - `deactivateAgent` funciona no nível do tenant, não do agente
- **Correção necessária:**
  - Criar `deleteAgentCompletely()` para limpar recursos
  - Adicionar rota `agent.delete` no `clientPanel`
  - Corrigir `deactivateAgent` para funcionar por agente específico

---

## 📋 RESUMO DO STATUS

| Funcionalidade | Status | Observação |
|---------------|--------|------------|
| 1 assinatura por tenant | ✅ | Implementado |
| Múltiplos agentes por tenant | ⚠️ | Bloqueado na criação |
| Créditos compartilhados | ✅ | Estrutura correta |
| Admin brecar todos agentes | ✅ | `tenants.suspend` funciona |
| Cliente apagar agente individual | ⚠️ | Falta rota e limpeza de recursos |

---

## 🔧 CORREÇÕES NECESSÁRIAS

### Prioridade ALTA (para funcionar corretamente):

1. **Remover bloqueio de múltiplos agentes em `createAgent`**
   - Linha 1041: Remover verificação `if (existingAgent)`
   - Permitir criação de múltiplos agentes

2. **Criar função `deleteAgentCompletely(agentId)`**
   - Deletar workflow N8N
   - Deletar instância Evolution
   - Deletar inbox Chatwoot
   - Desconectar Agent Bot do inbox
   - Deletar do banco (cascade em agentConfigs)

3. **Adicionar rotas no `clientPanel` para gerenciar agentes:**
   - `agent.list` - Listar todos os agentes do tenant
   - `agent.delete` - Deletar agente específico
   - `agent.deactivate` - Desativar agente específico (não deletar)
   - `agent.activate` - Ativar agente específico

4. **Corrigir `deactivateAgent` no `clientPanel`**
   - Funcionar por `agentId` específico
   - Não deletar Agent Bot compartilhado (está em `tenants`)
   - Apenas desativar recursos do agente específico

---

## ✅ VALIDAÇÃO FINAL

### Estrutura do Banco de Dados
- ✅ `tenants` tem assinatura única
- ✅ `agents` permite múltiplos por tenant
- ✅ `tenantCredits` é compartilhado (por tenantId)
- ✅ `usageTransactions` rastreia tenantId e agentId

### Funcionalidades Admin
- ✅ `tenants.suspend` - Breca todos os agentes
- ✅ `tenants.reactivate` - Reativa todos os agentes
- ✅ Verificação de status em `auth.ts` bloqueia acesso

### Funcionalidades Cliente
- ⚠️ `agent.createAgent` - Bloqueia múltiplos (precisa corrigir)
- ⚠️ `agent.delete` - Não existe (precisa criar)
- ⚠️ `agent.deactivate` - Funciona no tenant, não no agente (precisa corrigir)
- ⚠️ `agent.list` - Não existe (precisa criar)

---

## 🎯 CONCLUSÃO

**A estrutura base está CORRETA:**
- ✅ Schema do banco suporta múltiplos agentes
- ✅ Créditos são compartilhados corretamente
- ✅ Admin pode brecar todos os agentes

**Precisa corrigir:**
- ⚠️ Permitir criação de múltiplos agentes
- ⚠️ Permitir cliente deletar agentes individuais
- ⚠️ Permitir cliente desativar agentes individuais

---

**Data:** 2026-01-06
**Status:** Aguardando confirmação para implementar correções

