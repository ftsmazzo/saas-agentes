# 🎯 Visão do Produto e Plano de Construção

## 📋 SUA VISÃO (Entendida)

### Infraestrutura
- ✅ EasyPanel na Hetzner VPS
- ✅ Evolution API instalada
- ✅ PostgreSQL instalado
- ✅ Chatwoot instalado
- ✅ N8N instalado
- ✅ Agente eficiente já desenvolvido em N8N

### Fluxo Ideal do SaaS

```
1. Landing Page → Cliente assina plano
2. Pagamento Stripe → Webhook provisiona automaticamente:
   - Cria instância Evolution para o cliente
   - Clona workflow N8N (seu agente) para o cliente
   - Cria inbox no Chatwoot
   - Envia email de ativação
3. Cliente ativa conta → Define senha
4. Cliente faz login → Acessa painel
5. No painel, cliente:
   - Conecta WhatsApp (QR Code)
   - Vê agente funcionando automaticamente
   - Visualiza conversas em tempo real
   - Acompanha analytics/insights da IA
   - Refina agente (tom, regras, prompts)
   - Escolhe prompts mestres por nicho
```

### Características Desejadas
- 🎨 **Intuitivo**: Interface clara e fácil de usar
- 🎯 **Interativo**: Cliente pode ajustar tudo facilmente
- 🚀 **Acessível**: Não precisa ser técnico para usar
- 📊 **Insights**: Analytics inteligentes sobre conversas
- 🎭 **Personalizável**: Tom, regras, prompts customizáveis
- 📚 **Templates**: Prompts mestres por nicho (imobiliária, e-commerce, etc.)

---

## ✅ O QUE JÁ EXISTE (Pode Aproveitar)

### Backend
- ✅ Estrutura multi-tenant
- ✅ Integração Evolution API (cria instância, QR Code)
- ✅ Integração Chatwoot (busca conversas, mensagens)
- ✅ Integração N8N (clona workflow)
- ✅ Integração Stripe (checkout, webhook)
- ✅ Sistema de ativação de conta (token)
- ✅ Banco de dados estruturado

### Frontend
- ✅ Landing page com pricing
- ✅ Painel admin básico
- ✅ Painel cliente básico (estrutura)
- ✅ Página de QR Code WhatsApp
- ✅ Página de configuração do agente
- ✅ Página de métricas básicas

### Problemas Críticos
- ❌ **Login de clientes não funciona** (só OAuth admin)
- ❌ **Email não envia** (só console.log)
- ❌ **Conversas do Chatwoot não aparecem** (não tem página)
- ❌ **Analytics básicos** (precisa melhorar)
- ❌ **Prompts mestres não existem** (precisa criar)
- ❌ **Interface não é intuitiva** (precisa melhorar UX)

---

## 🚀 PLANO DE CONSTRUÇÃO

### FASE 1: Funcionalidade Básica (6-8 horas)
**Objetivo**: Sistema funcional end-to-end

#### 1.1 Sistema de Login para Clientes (2-3h)
- [ ] Criar endpoint `auth.clientLogin` (email + senha)
- [ ] Criar sistema de sessão JWT para clientes
- [ ] Modificar `createContext` para suportar ambos (OAuth admin + JWT clientes)
- [ ] Criar página `/client/login`
- [ ] Proteger rotas do painel do cliente
- [ ] Testar fluxo completo: ativação → login → acesso

#### 1.2 Sistema de Email Funcional (1-2h)
- [ ] Escolher provedor (Recomendo Resend - grátis)
- [ ] Implementar envio real em `server/email.ts`
- [ ] Template de email bonito
- [ ] Testar envio de email de ativação

#### 1.3 Corrigir Webhook Stripe (1h)
- [ ] Usar variável de ambiente para secret (não hardcoded)
- [ ] Verificar URL do webhook
- [ ] Testar webhook localmente com Stripe CLI

#### 1.4 Testar Fluxo Completo (2h)
- [ ] Criar tenant via webhook Stripe
- [ ] Receber email de ativação
- [ ] Ativar conta
- [ ] Fazer login
- [ ] Acessar painel
- [ ] Conectar WhatsApp

---

### FASE 2: Funcionalidades Essenciais (8-10 horas)
**Objetivo**: Painel do cliente completo e funcional

#### 2.1 Visualização de Conversas (3-4h)
- [ ] Criar página `/client/conversations`
- [ ] Listar conversas do Chatwoot (usar `getInboxConversations`)
- [ ] Mostrar mensagens de cada conversa (usar `getConversationMessages`)
- [ ] Interface tipo chat (similar ao WhatsApp)
- [ ] Atualização em tempo real (polling ou WebSocket)
- [ ] Filtros (abertas, resolvidas, todas)

#### 2.2 Analytics e Insights (3-4h)
- [ ] Melhorar página de métricas
- [ ] Gráficos de conversas ao longo do tempo
- [ ] Taxa de satisfação (se Chatwoot tiver)
- [ ] Tempo médio de resposta
- [ ] Horários de pico
- [ ] Insights inteligentes (ex: "Maioria das dúvidas sobre X")

#### 2.3 Refinamento do Agente (2h)
- [ ] Melhorar página de configuração
- [ ] Adicionar controle de tom (formal, casual, amigável)
- [ ] Adicionar regras customizáveis
- [ ] Preview de como o agente responde
- [ ] Salvar e aplicar mudanças no N8N workflow

---

### FASE 3: Funcionalidades Avançadas (6-8 horas)
**Objetivo**: Diferenciais e personalização

#### 3.1 Prompts Mestres por Nicho (3-4h)
- [ ] Criar tabela `promptTemplates` no banco
- [ ] Templates pré-configurados:
  - Imobiliária
  - E-commerce
  - Saúde/Clínica
  - Educação
  - Restaurante
  - etc.
- [ ] Interface para escolher template
- [ ] Aplicar template e personalizar
- [ ] Salvar como favorito

#### 3.2 Melhorias de UX (2-3h)
- [ ] Dashboard do cliente mais intuitivo
- [ ] Onboarding guiado (primeira vez)
- [ ] Tooltips e ajuda contextual
- [ ] Design mais moderno e limpo
- [ ] Mobile responsive

#### 3.3 Integração N8N Avançada (1h)
- [ ] Atualizar workflow N8N quando cliente muda configurações
- [ ] Sincronizar prompts do painel com N8N
- [ ] Logs de execução do workflow

---

### FASE 4: Polimento e Otimização (4-6 horas)
**Objetivo**: Sistema robusto e profissional

#### 4.1 Tratamento de Erros (2h)
- [ ] Mensagens de erro claras
- [ ] Fallbacks quando serviços estão offline
- [ ] Retry automático em falhas

#### 4.2 Performance (1h)
- [ ] Cache de dados frequentes
- [ ] Lazy loading de componentes
- [ ] Otimização de queries

#### 4.3 Testes (1-2h)
- [ ] Testar todos os fluxos
- [ ] Testar edge cases
- [ ] Testar com múltiplos clientes

---

## 📊 RESUMO DO PLANO

| Fase | Tempo | Funcionalidades |
|------|-------|-----------------|
| **FASE 1** | 6-8h | Login, Email, Webhook, Fluxo básico |
| **FASE 2** | 8-10h | Conversas, Analytics, Refinamento |
| **FASE 3** | 6-8h | Templates, UX, Integração avançada |
| **FASE 4** | 4-6h | Polimento, Performance, Testes |
| **TOTAL** | **24-32h** | Sistema completo e funcional |

---

## 🎯 PRIORIDADES (O que fazer primeiro)

### Se você quer algo funcional rápido:
1. **FASE 1 completa** (6-8h) → Sistema básico funcionando
2. **2.1 Visualização de Conversas** (3-4h) → Cliente vê conversas
3. **2.2 Analytics básico** (2h) → Métricas simples

**Total: 11-14 horas para MVP funcional**

### Se você quer algo completo:
Seguir todas as fases em ordem → **24-32 horas**

---

## 💡 RECOMENDAÇÕES

### Tecnologias Sugeridas
- **Email**: Resend (grátis, fácil, bonito)
- **Gráficos**: Recharts (já está no projeto)
- **Tempo Real**: Polling simples (WebSocket depois se necessário)

### Estrutura de Dados
- Criar tabela `promptTemplates` para templates mestres
- Adicionar campo `tone` (tom) na tabela `agentConfigs`
- Adicionar campo `rules` (regras) na tabela `agentConfigs`

### Integração N8N
- Seu workflow N8N precisa aceitar variáveis de ambiente:
  - `AGENT_PROMPT` (prompt do sistema)
  - `AGENT_TONE` (tom: formal, casual, etc.)
  - `AGENT_RULES` (regras JSON)
- Quando cliente muda configuração, atualizar variáveis no N8N

---

## ❓ PRÓXIMOS PASSOS

1. **Decidir escopo**: MVP rápido (11-14h) ou completo (24-32h)?
2. **Escolher provedor de email**: Resend (recomendado) ou outro?
3. **Começar FASE 1**: Posso começar agora mesmo!

---

## 🚀 POSSO COMEÇAR AGORA?

Se você aprovar, posso começar pela **FASE 1** imediatamente:
1. Sistema de login para clientes
2. Email funcional (Resend)
3. Corrigir webhook Stripe
4. Testar fluxo completo

**Quer que eu comece?** 🎯

