# 📋 Plano: Correção do Fluxo de Criação de Agentes

## 🎯 Objetivo
Corrigir o fluxo completo de criação de agentes para garantir:
- Nomes corretos dos agentes, caixas (Chatwoot) e robôs (Evolution)
- Processo claro e definido
- Facilidade para criar múltiplos agentes
- Páginas corretas aparecendo no momento certo

---

## 🔍 ANÁLISE DO FLUXO ATUAL

### ❌ Problemas Identificados

1. **Provisionamento Automático (Webhook Stripe)**
   - **Linha 202:** Cria agente automaticamente com `name: companyName`
   - **Linha 243:** Evolution usa `chatwootNameInbox: agent.name` (nome da empresa)
   - **Linha 333:** Agent Bot usa `botName = Agente ${companyName}`
   - **Resultado:** Agente, caixa e robô ficam com nome da empresa, não do agente

2. **Fluxo Confuso**
   - Agente já existe quando usuário acessa
   - Usuário não sabe que precisa configurar
   - Páginas erradas aparecendo

3. **Criação Manual de Agentes**
   - `CreateAgent.tsx` cria agente com nome "Novo Agente" (linha 49)
   - Mas provisionamento já criou um com nome da empresa
   - Conflito de nomes e confusão

---

## ✅ FLUXO IDEAL PROPOSTO

### 📍 Passo a Passo

1. **Assinatura (Stripe)**
   - ✅ Criar tenant
   - ❌ **NÃO criar agente automaticamente**
   - ✅ Enviar email de ativação

2. **Ativação de Conta**
   - Usuário ativa conta via email
   - Redirecionar para página "Crie seu Primeiro Agente"

3. **Página: "Crie seu Primeiro Agente"**
   - Formulário simples: **Nome do Agente**
   - Botão: "Criar Agente"
   - Após criar, provisionar recursos com nome correto

4. **Provisionamento com Nome Correto**
   - Evolution: `agent_${agentId}` (já está correto)
   - Chatwoot Inbox: usar `agent.name` (nome escolhido pelo usuário)
   - Agent Bot: usar `agent.name`
   - N8N Workflow: usar `agent.name`

5. **Configuração do Agente**
   - Assistente V4 para configurar prompt
   - Após configurar, mostrar opção de conectar WhatsApp

6. **Conectar WhatsApp**
   - Mostrar QR Code
   - Após conectar, mostrar opção de ativar

7. **Ativar Agente**
   - Botão de ativação
   - Agente pronto para uso

---

## 🔧 CORREÇÕES NECESSÁRIAS

### 1. **Remover Criação Automática de Agente no Provisionamento**

**Arquivo:** `server/webhooks/stripe.ts`

**Mudança:**
- ❌ Remover criação de agente automática (linhas 196-214)
- ✅ Manter apenas criação de tenant
- ✅ Adicionar flag `hasFirstAgent: false` no tenant

**Código a remover:**
```typescript
// REMOVER: Linhas 196-214
// 2. Criar agente PRIMEIRO (sem Evolution ainda)
agent = await createAgent({...});
```

**Código a adicionar:**
```typescript
// Marcar que tenant ainda não tem primeiro agente
await updateTenant(tenant.id, {
  hasFirstAgent: false
});
```

---

### 2. **Criar Página "Crie seu Primeiro Agente"**

**Arquivo:** `client/src/pages/client/WelcomeFirstAgent.tsx` (NOVO)

**Funcionalidades:**
- Formulário simples: campo "Nome do Agente"
- Botão "Criar Meu Primeiro Agente"
- Após criar, provisionar recursos
- Redirecionar para configuração

**Fluxo:**
1. Verificar se tenant tem agentes
2. Se não tiver, mostrar página de boas-vindas
3. Coletar nome do agente
4. Criar agente
5. Provisionar recursos (Evolution, Chatwoot, N8N) com nome correto
6. Redirecionar para configuração

---

### 3. **Corrigir Provisionamento para Usar Nome do Agente**

**Arquivo:** `server/routers.ts` (função `createAgent`)

**Mudanças:**
- ✅ Evolution: `agent_${agentId}` (já está correto)
- ✅ Chatwoot Inbox: usar `input.agentName` ao invés de `companyName`
- ✅ Agent Bot: usar `input.agentName` ao invés de `Agente ${companyName}`
- ✅ N8N Workflow: usar `input.agentName` no nome do workflow

**Linhas a corrigir:**
- Linha ~1206: Evolution já usa `agent_${agentId}` ✅
- Linha ~1260: Chatwoot inbox busca por `agent.name` ✅
- Linha ~1292: Agent Bot usa `botName = Agente ${companyName}` ❌ → usar `agent.name`
- Linha ~1273: N8N workflow usa `companyName` ❌ → usar `agent.name`

---

### 4. **Corrigir Webhook Stripe (se ainda criar agente)**

**Arquivo:** `server/webhooks/stripe.ts`

**Mudanças:**
- Se ainda criar agente no provisionamento, usar nome genérico temporário
- Permitir renomear depois
- OU: Não criar agente, apenas tenant

---

### 5. **Adicionar Roteamento Inteligente**

**Arquivo:** `client/src/App.tsx` ou `ClientLayout.tsx`

**Lógica:**
- Se tenant não tem agentes → mostrar página "Crie seu Primeiro Agente"
- Se tem agente mas não configurado → mostrar configuração
- Se tem agente configurado → mostrar dashboard/agentes

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Preparação
- [ ] Documentar fluxo atual completo
- [ ] Identificar todos os pontos que usam `companyName` para nomes
- [ ] Listar todas as páginas envolvidas

### Fase 2: Backend
- [ ] Remover criação automática de agente no webhook Stripe
- [ ] Corrigir `createAgent` para usar `agentName` em todos os recursos
- [ ] Testar provisionamento com nome correto

### Fase 3: Frontend
- [ ] Criar página "Crie seu Primeiro Agente"
- [ ] Adicionar roteamento inteligente
- [ ] Atualizar fluxo de criação manual

### Fase 4: Testes
- [ ] Testar fluxo completo: Assinatura → Ativação → Criar Agente → Configurar → WhatsApp → Ativar
- [ ] Testar criação de múltiplos agentes
- [ ] Verificar nomes em Evolution, Chatwoot e N8N

---

## 🎯 RESULTADO ESPERADO

### Fluxo Final:
1. **Assina** → Tenant criado (sem agente)
2. **Ativa conta** → Página "Crie seu Primeiro Agente"
3. **Dá nome ao agente** → "Meu Agente de Vendas"
4. **Cria agente** → Provisiona com nome correto:
   - Evolution: `agent_123`
   - Chatwoot Inbox: "Meu Agente de Vendas"
   - Agent Bot: "Meu Agente de Vendas"
   - N8N Workflow: "Meu Agente de Vendas"
5. **Configura** → Assistente V4
6. **Conecta WhatsApp** → QR Code
7. **Ativa** → Agente pronto

### Múltiplos Agentes:
- Usuário pode criar vários agentes
- Cada um com nome único
- Cada um com seus próprios recursos (Evolution, Chatwoot, N8N)

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Compatibilidade:** Tenants antigos que já têm agente criado automaticamente
2. **Migração:** Se necessário, criar script para renomear agentes existentes
3. **Validação:** Garantir que nomes são únicos por tenant
4. **Erros:** Tratar erros de provisionamento graciosamente

---

## 📊 ORDEM DE PRIORIDADE

1. **CRÍTICO:** Remover criação automática de agente
2. **CRÍTICO:** Corrigir nomes no provisionamento
3. **IMPORTANTE:** Criar página "Crie seu Primeiro Agente"
4. **IMPORTANTE:** Adicionar roteamento inteligente
5. **NICE TO HAVE:** Melhorias de UX

---

## 🚀 PRÓXIMOS PASSOS

1. Revisar este plano
2. Confirmar abordagem
3. Implementar fase por fase
4. Testar cada fase antes de prosseguir

