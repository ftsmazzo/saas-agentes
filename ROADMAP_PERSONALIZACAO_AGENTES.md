# 🚀 Roadmap: Sistema de Agentes Personalizáveis

## 📊 Visão Geral

Sistema autônomo para vender agentes de IA com capacidade de personalização completa, permitindo que cada cliente configure seu agente conforme suas necessidades.

---

## ✅ O QUE JÁ TEMOS IMPLEMENTADO

### 1. Infraestrutura Core
- ✅ Sistema multi-tenant
- ✅ Provisionamento automático (Evolution API, N8N, Chatwoot)
- ✅ Integração Stripe (checkout e webhooks)
- ✅ Sistema de ativação de conta
- ✅ Agente de IA integrado (N8N)
- ✅ Respostas automáticas 24/7

### 2. Painel Administrativo
- ✅ Gestão de clientes (listar, criar, suspender)
- ✅ Gestão de planos (CRUD completo)
- ✅ Logs de plataforma
- ✅ Dashboard básico

### 3. Painel do Cliente
- ✅ Conexão WhatsApp (QR Code)
- ✅ Configuração básica do agente (prompt)
- ✅ Visualização de métricas básicas
- ✅ Gerenciamento de assinatura

---

## 🎯 O QUE PRECISAMOS IMPLEMENTAR

## 📊 FASE 1: Dashboard Administrativo Completo

### 1.1 Métricas e Analytics

**Implementação:**
- [ ] Cards de métricas:
  - Total de clientes ativos
  - Clientes inativos
  - Clientes em trial
  - Clientes inadimplentes
  - Receita mensal recorrente (MRR)
  - Churn rate
  - Total de conversas processadas
  - Total de mensagens respondidas
- [ ] Gráficos:
  - Crescimento de clientes (linha)
  - Distribuição por plano (pizza)
  - Receita ao longo do tempo (área)
  - Conversas por dia/semana/mês
  - Taxa de resposta do agente

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2-3 dias

---

### 1.2 Controle Avançado de Clientes

**Implementação:**
- [ ] Filtros avançados:
  - Por status (ativo, suspenso, trial, inadimplente)
  - Por plano
  - Por data de criação
  - Por uso (alto, médio, baixo)
- [ ] Ações em massa:
  - Suspender múltiplos clientes
  - Mudar plano em massa
  - Enviar notificações em massa
- [ ] Detalhes do cliente:
  - Histórico de pagamentos
  - Uso de recursos (execuções, conversas, tokens)
  - Logs de atividade
  - Configurações do agente
  - Estatísticas de performance

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2-3 dias

---

## 🤖 FASE 2: Personalização Avançada de Agentes

### 2.1 Templates por Nicho

**Schema a criar:**
```sql
CREATE TABLE agentTemplates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  niche VARCHAR(100) NOT NULL, -- 'imobiliaria', 'ecommerce', 'saude', etc.
  systemPrompt TEXT NOT NULL,
  welcomeMessage TEXT,
  exampleConversations JSON,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Implementação:**
- [ ] Biblioteca de templates pré-configurados:
  - Imobiliária
  - E-commerce
  - Saúde/Clínicas
  - Educação
  - Atendimento ao cliente
  - Vendas
- [ ] Interface para aplicar template ao agente
- [ ] Preview do template antes de aplicar
- [ ] Customização após aplicar template

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 3-4 dias

---

### 2.2 Configurações Avançadas do Agente

**Campos a adicionar no schema `agentConfigs`:**
```sql
ALTER TABLE agentConfigs ADD COLUMN tone VARCHAR(50) DEFAULT 'professional'; -- 'professional', 'friendly', 'formal', 'casual'
ALTER TABLE agentConfigs ADD COLUMN responseSpeed VARCHAR(50) DEFAULT 'normal'; -- 'fast', 'normal', 'detailed'
ALTER TABLE agentConfigs ADD COLUMN language VARCHAR(10) DEFAULT 'pt-BR';
ALTER TABLE agentConfigs ADD COLUMN businessHours JSON; -- Horários de funcionamento
ALTER TABLE agentConfigs ADD COLUMN autoReplyRules JSON; -- Regras de resposta automática
ALTER TABLE agentConfigs ADD COLUMN knowledgeBase TEXT; -- Base de conhecimento
ALTER TABLE agentConfigs ADD COLUMN blockedWords TEXT; -- Palavras bloqueadas
ALTER TABLE agentConfigs ADD COLUMN greetingVariations JSON; -- Variações de saudação
```

**Implementação:**
- [ ] Seletor de tom de voz (profissional, amigável, formal, casual)
- [ ] Configuração de velocidade de resposta
- [ ] Base de conhecimento (FAQ, informações da empresa)
- [ ] Regras de resposta automática:
  - Horários de funcionamento
  - Respostas para palavras-chave específicas
  - Escalação para humano em situações específicas
- [ ] Palavras bloqueadas (filtro de conteúdo)
- [ ] Variações de mensagens (evitar repetição)

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 4-5 dias

---

### 2.3 Editor Visual de Fluxos de Conversa

**Implementação:**
- [ ] Interface drag-and-drop para criar fluxos
- [ ] Nós de decisão (se/então)
- [ ] Integração com variáveis dinâmicas
- [ ] Preview do fluxo
- [ ] Teste do fluxo antes de ativar

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 7-10 dias

---

## 💳 FASE 3: Sistema de Planos Avançado

### 3.1 Limites Personalizáveis

**Campos a adicionar no schema `plans`:**
```sql
ALTER TABLE plans ADD COLUMN maxConversationsPerMonth INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxMessagesPerDay INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxAITokensPerMonth INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxKnowledgeBaseItems INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN maxCustomFlows INT DEFAULT NULL;
ALTER TABLE plans ADD COLUMN trialDays INT DEFAULT 0;
ALTER TABLE plans ADD COLUMN trialFeatures JSON;
```

**Implementação:**
- [ ] Interface para configurar limites por plano:
  - Conversas por mês
  - Mensagens por dia
  - Tokens de IA por mês
  - Itens na base de conhecimento
  - Fluxos customizados
- [ ] Validação de limites no backend
- [ ] Alertas quando cliente se aproxima do limite
- [ ] Bloqueio automático ao exceder limite
- [ ] Dashboard de uso para o cliente

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 3-4 dias

---

### 3.2 Planos de Trial

**Implementação:**
- [ ] Configurar período de trial por plano
- [ ] Definir quais recursos liberar no trial
- [ ] Notificações antes do fim do trial (3 dias, 1 dia)
- [ ] Conversão automática para plano pago
- [ ] Opção de cancelar antes do fim do trial

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 2 dias

---

## 🔄 FASE 4: Automação de Cobrança

### 4.1 Gestão de Inadimplência

**Implementação:**
- [ ] Configuração de dias para suspensão (ex: 7 dias)
- [ ] Suspensão automática após X dias sem pagar
- [ ] Reativação automática ao pagar
- [ ] Notificações de cobrança:
  - Email 3 dias antes do vencimento
  - Email no dia do vencimento
  - Email após 3 dias de atraso
  - Email antes da suspensão
- [ ] Histórico de tentativas de cobrança
- [ ] Dashboard de inadimplência

**Prioridade:** 🔴 ALTA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 3-4 dias

---

## 📋 FASE 5: Sistema de CRM/Kanban

### 5.1 Pipeline Visual para Leads

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
- [ ] Interface drag-and-drop (dnd-kit)
- [ ] Criar/editar/deletar boards
- [ ] Criar/editar/deletar stages (ex: Novo → Contato → Proposta → Fechado)
- [ ] Criar/editar/deletar cards
- [ ] Associar cards a contatos do WhatsApp
- [ ] Histórico de movimentações
- [ ] Notificações quando lead muda de etapa

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
- [ ] Editor de mensagens com variáveis:
  - {nome}
  - {empresa}
  - {cidade}
  - {telefone}
  - Variáveis customizadas
- [ ] Preview de mensagens (como ficará para cada contato)
- [ ] Agendamento de disparos
- [ ] Relatório de disparos (enviados, falhados, pendentes)
- [ ] Histórico de disparos

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 10-14 dias

---

### 6.2 Mecanismo Anti-Bloqueio

**Implementação:**
- [ ] Randomização de mensagens (variações automáticas)
- [ ] Intervalos inteligentes (imitar comportamento humano)
- [ ] Pausa automática após X disparos
- [ ] Validação de contatos antes de disparar
- [ ] Limite de disparos por hora/dia (configurável por plano)

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 7-10 dias

---

## 📊 FASE 7: Analytics e Relatórios

### 7.1 Analytics para Clientes

**Implementação:**
- [ ] Dashboard de métricas:
  - Total de conversas
  - Taxa de resposta
  - Tempo médio de resposta
  - Conversas convertidas (se integrado com CRM)
  - Horários de pico
- [ ] Gráficos:
  - Conversas ao longo do tempo
  - Distribuição por dia da semana
  - Distribuição por horário
  - Top palavras-chave
- [ ] Exportação de relatórios (PDF, Excel)

**Prioridade:** 🟡 MÉDIA
**Complexidade:** 🟡 MÉDIA
**Tempo estimado:** 4-5 dias

---

### 7.2 Análise de Sentimento

**Implementação:**
- [ ] Análise de sentimento das conversas (positivo, neutro, negativo)
- [ ] Gráfico de evolução do sentimento
- [ ] Alertas para conversas negativas
- [ ] Sugestões de melhoria baseadas no sentimento

**Prioridade:** 🟢 BAIXA
**Complexidade:** 🔴 ALTA
**Tempo estimado:** 5-7 dias

---

## 🎯 PRIORIZAÇÃO RECOMENDADA

### Sprint 1 (2 semanas) - Fundação
1. ✅ Dashboard administrativo completo
2. ✅ Templates por nicho
3. ✅ Configurações avançadas do agente
4. ✅ Limites personalizáveis nos planos

### Sprint 2 (2 semanas) - Automação
5. ✅ Gestão de inadimplência automática
6. ✅ Planos de trial
7. ✅ Analytics para clientes

### Sprint 3 (3 semanas) - Funcionalidades Avançadas
8. ✅ Sistema de CRM/Kanban
9. ✅ Sistema de disparos básico

### Sprint 4 (2 semanas) - Refinamento
10. ✅ Mecanismo anti-bloqueio
11. ✅ Editor visual de fluxos (opcional)

---

## 💡 DIFERENCIAIS QUE PODEMOS ADICIONAR

1. **Integrações**
   - CRM (Pipedrive, HubSpot, RD Station)
   - E-commerce (Shopify, WooCommerce)
   - Email marketing (Mailchimp, RD Station)

2. **API Pública**
   - Permitir que clientes integrem com seus sistemas
   - Webhooks para eventos (nova conversa, lead qualificado, etc.)

3. **Multi-idioma**
   - Suporte a múltiplos idiomas no agente
   - Tradução automática de mensagens

4. **Aprendizado Contínuo**
   - O agente aprende com conversas anteriores
   - Sugestões de melhorias baseadas em dados

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS

1. **Decidir prioridades** - Quais funcionalidades são mais importantes?
2. **Começar pelo Sprint 1** - Dashboard e personalização de agentes
3. **Testar com clientes beta** - Validar funcionalidades antes de lançar

---

## 🎯 META FINAL

Criar uma plataforma completa para vender agentes de IA personalizáveis que permite:
- ✅ Personalização completa do agente (prompts, tom, regras, etc.)
- ✅ Templates prontos por nicho
- ✅ Sistema de planos flexível com limites configuráveis
- ✅ Automação completa do ciclo de cobrança
- ✅ Funcionalidades avançadas (CRM, disparos, analytics)
- ✅ Dashboard administrativo completo

**Tempo total estimado:** 8-12 semanas
**Foco:** Personalização dos agentes, não white label

