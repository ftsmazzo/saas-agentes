# 📋 Análise Completa: Regra de Negócio - 1 Tenant = 1 Assinatura, Múltiplos Agentes

## 🎯 REGRA DE NEGÓCIO DEFINIDA

- **1 Empresa (Tenant) = 1 Assinatura**
- **1 Empresa pode ter múltiplos Agentes**
- **Todos os Agentes compartilham os créditos da mesma assinatura**
- **Pode excluir agentes específicos**
- **Pode desativar agentes específicos**

---

## ✅ ANÁLISE DO SCHEMA DO BANCO

### ✅ CORRETO - Tabelas que seguem a regra:

1. **`tenants`** ✅
   - `stripeSubscriptionId` - Assinatura por tenant (correto)
   - `currentPlanId` - Plano por tenant (correto)
   - `chatwootAgentBotId`, `chatwootAgentBotToken` - Compartilhados entre agentes (correto)

2. **`agents`** ✅
   - `tenantId` - Múltiplos agentes por tenant (correto)
   - `n8nWorkflowId`, `evolutionInstanceName`, `chatwootInboxId` - Específicos por agente (correto)

3. **`tenantCredits`** ✅
   - `tenantId` - Créditos por tenant, não por agente (correto)
   - Todos os agentes compartilham os mesmos créditos

4. **`usageTransactions`** ✅
   - `tenantId` - Rastreia qual tenant (correto)
   - `agentId` - Rastreia qual agente usou (opcional, para analytics) (correto)
   - Créditos são deduzidos do tenant, não do agente

5. **`usageMetrics`** ✅
   - `tenantId` - Métricas agregadas por tenant (correto)

6. **`agentConfigs`** ✅
   - `agentId` - Configuração específica por agente (correto)

7. **`conversations`** ✅
   - `tenantId` - Isolamento multi-tenant (correto)
   - `agentId` - Opcional, para rastrear qual agente (correto)

8. **`chatMessages`** ✅
   - `tenantId` - Isolamento multi-tenant (correto)
   - `agentId` - Opcional, para rastrear qual agente (correto)

---

## ✅ ANÁLISE DAS QUERIES DE CRÉDITOS

### ✅ CORRETO - Todas as queries de créditos usam `tenantId`:

- `checkCreditsAvailable(tenantId)` ✅
- `getTenantCredits(tenantId)` ✅
- `recordUsageTransaction(tenantId, ...)` ✅
- `updateMonthlyMetrics(tenantId, ...)` ✅

**Conclusão:** Sistema de créditos está correto - todos os agentes compartilham os créditos do tenant.

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. ❌ `deactivateAgent` está desativando no nível do TENANT, não do AGENTE

**Localização:** `server/routers.ts` linha ~2339

**Problema:**
- A função `deactivateAgent` está usando `getTenantAgent()` que retorna apenas o primeiro agente
- Está deletando o Agent Bot compartilhado do tenant (não deveria)
- Não permite desativar um agente específico

**Correção necessária:**
- Criar rota para desativar agente específico por `agentId`
- Apenas desativar recursos do agente específico (workflow N8N, Evolution, inbox Chatwoot)
- NÃO deletar Agent Bot compartilhado (está em `tenants`)

### 2. ❌ `deleteAgent` não limpa recursos externos

**Localização:** `server/db.ts` linha ~361

**Problema:**
- `deleteAgent()` apenas deleta do banco
- Não deleta recursos externos (N8N workflow, Evolution instance, Chatwoot inbox)
- Pode deixar recursos órfãos

**Correção necessária:**
- Criar função `deleteAgentCompletely(agentId)` similar a `deleteTenantCompletely()`
- Deletar recursos externos antes de deletar do banco

### 3. ⚠️ Falta rota para listar agentes de um tenant

**Problema:**
- Não há rota no `clientPanel` para listar todos os agentes do tenant
- Cliente não consegue ver/gerenciar múltiplos agentes

**Correção necessária:**
- Adicionar rota `getAgents` no `clientPanel`

### 4. ⚠️ Falta rota para criar novo agente

**Problema:**
- Não há rota no `clientPanel` para criar novos agentes
- Cliente não consegue criar múltiplos agentes

**Correção necessária:**
- Adicionar rota `createAgent` no `clientPanel`

---

## 📋 CHECKLIST DE CORREÇÕES NECESSÁRIAS

### Backend (server/routers.ts)

- [ ] **Corrigir `deactivateAgent`** - Deve desativar agente específico, não tenant
- [ ] **Criar `deleteAgentCompletely`** - Deletar agente com limpeza de recursos externos
- [ ] **Adicionar rota `getAgents`** - Listar todos os agentes do tenant
- [ ] **Adicionar rota `createAgent`** - Criar novo agente para o tenant
- [ ] **Adicionar rota `deleteAgent`** - Deletar agente específico
- [ ] **Adicionar rota `updateAgent`** - Atualizar informações do agente

### Frontend (client/)

- [ ] **Criar página de listagem de agentes**
- [ ] **Criar página de criação de agente**
- [ ] **Adicionar botão de exclusão por agente**
- [ ] **Adicionar botão de desativação por agente**

### N8N Workflows

- [ ] **Verificar queries que usam `tenantId`** - Garantir que não quebram com múltiplos agentes
- [ ] **Atualizar queries `agentConfigs`** - Já corrigido ✅

---

## 🔍 QUERIES QUE PRECISAM SER VERIFICADAS

### N8N Workflows

1. **Buscar configurações do agente**
   - ✅ Já corrigido - usa JOIN com `agents` via `tenantId`

2. **Buscar conversas**
   - Verificar se usa `tenantId` ou `agentId`
   - Se usar `agentId`, garantir que funciona com múltiplos agentes

3. **Buscar mensagens**
   - Verificar se usa `tenantId` ou `agentId`
   - Se usar `agentId`, garantir que funciona com múltiplos agentes

4. **Criar/atualizar clientData**
   - Verificar se usa `tenantId` (correto) ou `agentId` (pode ser opcional)

---

## ✅ VALIDAÇÃO FINAL

### Estrutura de Dados
- ✅ Schema do banco está correto
- ✅ Créditos são por tenant (correto)
- ✅ Agentes são por tenant (correto)
- ✅ Configurações são por agente (correto)

### Queries de Créditos
- ✅ Todas usam `tenantId` (correto)
- ✅ Nenhuma usa `agentId` para créditos (correto)

### Exclusão/Desativação
- ⚠️ `deleteAgent` precisa limpar recursos externos
- ⚠️ `deactivateAgent` precisa funcionar por agente, não por tenant

### Rotas de API
- ⚠️ Faltam rotas para gerenciar múltiplos agentes

---

## 📝 PRÓXIMOS PASSOS

1. **Corrigir `deactivateAgent`** - Funcionar por agente específico
2. **Criar `deleteAgentCompletely`** - Limpar recursos externos
3. **Adicionar rotas de gerenciamento de agentes** - CRUD completo
4. **Atualizar frontend** - Interface para múltiplos agentes
5. **Testar fluxo completo** - Criar, listar, desativar, deletar agentes

---

**Data de análise:** 2026-01-06

