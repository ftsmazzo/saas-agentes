# 🔧 Plano de Refatoração Sistemática

## 📋 ESTRUTURA DO PROJETO

### Frontend (client/src/pages)
**Admin:**
- ✅ Login.tsx (funcionando)
- ⏳ Dashboard.tsx
- ⏳ Tenants.tsx
- ⏳ Plans.tsx
- ⏳ Logs.tsx
- ⏳ Settings.tsx
- ⏳ Profile.tsx
- ⏳ Users.tsx
- ⏳ Welcome.tsx

**Cliente:**
- ⏳ Login.tsx
- ⏳ AgentConfig.tsx
- ⏳ AgentConfigUnified.tsx (CRÍTICO - criação de agentes)
- ⏳ AgentSettings.tsx
- ⏳ CreateAgent.tsx
- ⏳ Interactions.tsx
- ⏳ Messages.tsx
- ⏳ Metrics.tsx
- ⏳ Subscription.tsx
- ⏳ WhatsAppQRCode.tsx

**Público:**
- ⏳ Home.tsx
- ⏳ ActivateAccount.tsx

### Backend (server)
- ⚠️ routers.ts (3232 linhas - CRÍTICO)
- ⏳ plan-validation.ts
- ⏳ routers-agent-assistant.ts
- ⏳ credit-system.ts
- ⏳ n8n-integration.ts
- ⏳ evolution-integration.ts
- ⏳ chatwoot-integration.ts

---

## 🎯 ORDEM DE REFATORAÇÃO

### FASE 1: Backend - routers.ts (URGENTE) ⚡
**Prioridade:** CRÍTICA

**Problemas:**
- 43 referências a `tenant.n8nWorkflowId` (agora está em `agent`)
- 43 referências a `tenant.evolutionInstanceName` (agora está em `agent`)
- Funções que criam agentes precisam criar `agent` primeiro
- Funções que atualizam configs precisam usar `agentId`

**Solução:**
1. Criar função helper `getTenantAgent(tenantId)`
2. Substituir todas as referências
3. Atualizar funções de criação/atualização

---

### FASE 2: Backend - Outros Arquivos
- plan-validation.ts
- routers-agent-assistant.ts
- credit-system.ts

---

### FASE 3: Frontend - Páginas Críticas
1. **AgentConfigUnified.tsx** (criação de agentes) - CRÍTICO
2. **AgentConfig.tsx** (configuração)
3. **WhatsAppQRCode.tsx** (conexão WhatsApp)
4. **Dashboard.tsx** (admin e cliente)

---

### FASE 4: Frontend - Páginas Secundárias
- Todas as outras páginas
- Componentes
- Hooks

---

### FASE 5: Limpeza Final
- Remover código duplicado
- Remover arquivos obsoletos
- Organizar documentação

---

## 📊 PROGRESSO

### ✅ Concluído
- [x] Funções de agents em db.ts
- [x] Login admin funcionando

### ⏳ Em Progresso
- [ ] Refatorar routers.ts (43 referências)

### 📝 Pendente
- [ ] Revisar todas as páginas do frontend
- [ ] Dividir routers.ts
- [ ] Testes completos

---

**Vamos começar!** 🚀

