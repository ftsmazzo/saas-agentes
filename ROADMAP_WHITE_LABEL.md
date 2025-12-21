# 🚀 Roadmap: Transformação em White Label Completo

## 📊 Análise Comparativa: O que temos vs. O que o concorrente oferece

### ✅ O QUE JÁ TEMOS IMPLEMENTADO

#### 1. Infraestrutura Multi-Tenant
- ✅ Sistema de tenants isolados
- ✅ Provisionamento automático (Evolution API, N8N, Chatwoot)
- ✅ Banco de dados por tenant (estrutura pronta)
- ✅ Integração Stripe (checkout e webhooks)
- ✅ Sistema de ativação de conta

#### 2. Painel Administrativo
- ✅ Gestão de clientes (listar, criar, suspender)
- ✅ Gestão de planos (CRUD completo)
- ✅ Logs de plataforma
- ✅ Dashboard básico

#### 3. Painel do Cliente
- ✅ Conexão WhatsApp (QR Code)
- ✅ Configuração do agente (prompt)
- ✅ Visualização de métricas básicas
- ✅ Gerenciamento de assinatura

#### 4. Funcionalidades Core
- ✅ Agente de IA integrado (N8N)
- ✅ Respostas automáticas 24/7
- ✅ Integração com Chatwoot

---

### ❌ O QUE PRECISAMOS IMPLEMENTAR

## 🎨 FASE 1: Personalização de Marca (White Label)

### 1.1 Identidade Visual Completa

**Campos a adicionar no schema `tenants`:**
```sql
ALTER TABLE tenants ADD COLUMN logoUrl TEXT;
ALTER TABLE tenants ADD COLUMN faviconUrl TEXT;
ALTER TABLE tenants ADD COLUMN primaryColor VARCHAR(7) DEFAULT '#0074d4';
ALTER TABLE tenants ADD COLUMN secondaryColor VARCHAR(7) DEFAULT '#6c757d';
ALTER TABLE tenants ADD COLUMN customDomain VARCHAR(255);
```

**Implementação:**
- [ ] Upload de logo (S3 ou storage local)
- [ ] Upload de favicon
- [ ] Seletor de cores (color picker)
- [ ] Configuração de domínio personalizado
- [ ] Aplicar branding no frontend (tema dinâmico)

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2-3 dias

---

### 1.2 Comunicações Personalizadas

**Implementação:**
- [ ] Templates de email personalizáveis
- [ ] Variáveis dinâmicas nos emails ({companyName}, {logo}, etc.)
- [ ] Email de boas-vindas customizado
- [ ] Email de cobrança customizado
- [ ] Email de suspensão customizado

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🟢 BAIXA
**Tempo estimado:** 1-2 dias

---

## 📊 FASE 2: Painel Administrativo Avançado

### 2.1 Dashboard Completo

**Implementação:**
- [ ] Cards de métricas:
  - Total de clientes ativos
  - Clientes inativos
  - Clientes em trial
  - Clientes inadimplentes
  - Receita mensal recorrente (MRR)
  - Churn rate
- [ ] Gráficos:
  - Crescimento de clientes (linha)
  - Distribuição por plano (pizza)
  - Receita ao longo do tempo (área)

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2-3 dias

---

### 2.2 Controle Total de Clientes

**Implementação:**
- [ ] Filtros avançados:
  - Por status (ativo, suspenso, trial, inadimplente)
  - Por plano
  - Por data de criação
- [ ] Ações em massa:
  - Suspender múltiplos clientes
  - Mudar plano em massa
  - Enviar email em massa
- [ ] Detalhes do cliente:
  - Histórico de pagamentos
  - Uso de recursos (execuções, conversas)
  - Logs de atividade

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2-3 dias

---

## 💳 FASE 3: Sistema de Planos Avançado

### 3.1 Limites Personalizáveis

**Campos a adicionar no schema `plans`:**
```sql
ALTER TABLE plans ADD COLUMN maxConnections INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxContacts INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxLists INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxBroadcasts INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxKanbanBoards INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxAITokens INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN trialDays INT DEFAULT 0;
ALTER TABLE plans ADD COLUMN trialFeatures JSON;
```

**Implementação:**
- [ ] Interface para configurar limites por plano
- [ ] Validação de limites no backend
- [ ] Alertas quando cliente se aproxima do limite
- [ ] Bloqueio automático ao exceder limite

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 3-4 dias

---

### 3.2 Planos de Trial

**Implementação:**
- [ ] Configurar período de trial por plano
- [ ] Definir quais recursos liberar no trial
- [ ] Notificações antes do fim do trial
- [ ] Conversão automática para plano pago

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2 dias

---

## 🔄 FASE 4: Automação de Cobrança

### 4.1 Gestão de Inadimplência

**Implementação:**
- [ ] Configuração de dias para suspensão
- [ ] Suspensão automática após X dias sem pagar
- [ ] Reativação automática ao pagar
- [ ] Notificações de cobrança (email, WhatsApp)
- [ ] Histórico de tentativas de cobrança

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 3-4 dias

---

### 4.2 Integração com Múltiplos Gateways

**Implementação:**
- [ ] Suporte a Mercado Pago
- [ ] Suporte a PagSeguro
- [ ] Suporte a Asaas
- [ ] Interface para escolher gateway por cliente
- [ ] Webhooks para cada gateway

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 5-7 dias

---

## 📋 FASE 5: Sistema de CRM/Kanban

### 5.1 Pipeline Visual

**Schema a criar:**
```sql
CREATE TABLE kanbanBoards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

CREATE TABLE kanbanStages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boardId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  FOREIGN KEY (boardId) REFERENCES kanbanBoards(id)
);

CREATE TABLE kanbanCards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stageId INT NOT NULL,
  contactId INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (stageId) REFERENCES kanbanStages(id),
  FOREIGN KEY (contactId) REFERENCES contacts(id)
);
```

**Implementação:**
- [ ] Interface drag-and-drop (react-beautiful-dnd ou dnd-kit)
- [ ] Criar/editar/deletar boards
- [ ] Criar/editar/deletar stages
- [ ] Criar/editar/deletar cards
- [ ] Associar cards a contatos
- [ ] Histórico de movimentações

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 7-10 dias

---

## 📤 FASE 6: Sistema de Disparos em Massa

### 6.1 Funcionalidades Core

**Schema a criar:**
```sql
CREATE TABLE broadcastLists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

CREATE TABLE broadcastContacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listId INT NOT NULL,
  contactId INT NOT NULL,
  FOREIGN KEY (listId) REFERENCES broadcastLists(id),
  FOREIGN KEY (contactId) REFERENCES contacts(id)
);

CREATE TABLE broadcasts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  listId INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending', 'sending', 'completed', 'failed'),
  totalContacts INT,
  sentCount INT DEFAULT 0,
  failedCount INT DEFAULT 0,
  scheduledAt TIMESTAMP,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id),
  FOREIGN KEY (listId) REFERENCES broadcastLists(id)
);
```

**Implementação:**
- [ ] Importação de contatos (CSV/Excel)
- [ ] Criação de listas de contatos
- [ ] Editor de mensagens com variáveis ({nome}, {empresa}, etc.)
- [ ] Preview de mensagens
- [ ] Agendamento de disparos
- [ ] Relatório de disparos (enviados, falhados)

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 10-14 dias

---

### 6.2 Mecanismo Anti-Bloqueio

**Implementação:**
- [ ] Randomização de conexões (alternar entre números)
- [ ] Randomização de mensagens (variações automáticas)
- [ ] Intervalos inteligentes (imitar comportamento humano)
- [ ] Pausa automática após X disparos
- [ ] Validação de contatos antes de disparar

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 7-10 dias

---

## 🎯 PRIORIZAÇÃO RECOMENDADA

### Sprint 1 (2 semanas) - Fundação White Label
1. ✅ Personalização de marca (logo, cores, favicon)
2. ✅ Dashboard administrativo completo
3. ✅ Limites personalizáveis nos planos

### Sprint 2 (2 semanas) - Automação
4. ✅ Gestão de inadimplência automática
5. ✅ Planos de trial
6. ✅ Comunicações personalizadas

### Sprint 3 (3 semanas) - Funcionalidades Avançadas
7. ✅ Sistema de CRM/Kanban
8. ✅ Sistema de disparos básico

### Sprint 4 (2 semanas) - Refinamento
9. ✅ Mecanismo anti-bloqueio
10. ✅ Integração com múltiplos gateways

---

## 💡 DIFERENCIAIS QUE PODEMOS ADICIONAR

1. **Analytics Avançado**
   - Funil de conversão
   - Análise de sentimento das conversas
   - ROI por cliente

2. **Templates por Nicho**
   - Prompts pré-configurados (imobiliária, e-commerce, etc.)
   - Fluxos de conversa prontos
   - Mensagens de boas-vindas por nicho

3. **API Pública**
   - Permitir que clientes integrem com seus sistemas
   - Webhooks para eventos (nova conversa, pagamento, etc.)

4. **Marketplace de Integrações**
   - Integração com CRM (Pipedrive, HubSpot)
   - Integração com e-commerce (Shopify, WooCommerce)
   - Integração com email marketing (RD Station, Mailchimp)

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS

1. **Decidir prioridades** - Quais funcionalidades são mais importantes para você?
2. **Criar issues no GitHub** - Organizar tarefas por sprint
3. **Começar pela Fase 1** - Personalização de marca é o diferencial mais visível
4. **Testar com clientes beta** - Validar funcionalidades antes de lançar

---

## 🎯 META FINAL

Transformar o sistema atual em uma plataforma white label completa que permite:
- ✅ Revenda sem limites
- ✅ Personalização total da marca
- ✅ Controle completo de preços e planos
- ✅ Automação completa do ciclo de cobrança
- ✅ Funcionalidades avançadas (CRM, disparos, etc.)

**Tempo total estimado:** 8-12 semanas
**Investimento:** Desenvolvimento incremental, testando cada fase


