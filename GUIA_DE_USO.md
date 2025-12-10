# Guia Completo de Uso - SaaS de Agentes N8N

**Bem-vindo à sua plataforma SaaS de Agentes de IA!** Este guia explica passo a passo como configurar e utilizar todo o sistema, desde a configuração inicial até o provisionamento de clientes.

---

## Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Configuração Inicial](#configuração-inicial)
3. [Integração com Stripe](#integração-com-stripe)
4. [Integração com N8N](#integração-com-n8n)
5. [Configuração do PostgreSQL Master](#configuração-do-postgresql-master)
6. [Criando seu Primeiro Cliente](#criando-seu-primeiro-cliente)
7. [Como Funciona o Provisionamento](#como-funciona-o-provisionamento)
8. [Gerenciamento de Planos e Assinaturas](#gerenciamento-de-planos-e-assinaturas)
9. [Monitoramento e Logs](#monitoramento-e-logs)
10. [Solução de Problemas](#solução-de-problemas)

---

## Visão Geral da Arquitetura

A plataforma funciona como um **sistema multi-tenant** que provisiona automaticamente recursos para cada cliente:

### Componentes Principais

**Painel Administrativo (você)**
- Gerencia clientes (tenants)
- Configura planos de assinatura
- Monitora consumo e métricas
- Visualiza logs e eventos

**Painel do Cliente (seus clientes)**
- Configura o agente de IA (prompt personalizado)
- Visualiza métricas de uso
- Gerencia assinatura e pagamento

**Provisionamento Automático**
Quando você cria um novo cliente, o sistema automaticamente:
1. Cria um banco de dados PostgreSQL isolado para o cliente
2. Clona o workflow template do N8N e personaliza para o cliente
3. Configura credenciais e variáveis de ambiente
4. Cria sessão de checkout no Stripe para pagamento

---

## Configuração Inicial

### Passo 1: Configurar Variáveis de Ambiente

As configurações são feitas através de **variáveis de ambiente**. Você precisa configurá-las antes de usar a plataforma.

#### Variáveis Obrigatórias

Crie ou edite o arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# === N8N Integration ===
N8N_API_URL=https://seu-n8n.exemplo.com
N8N_API_KEY=sua_api_key_do_n8n
N8N_TEMPLATE_WORKFLOW_ID=123

# === PostgreSQL Master (para provisionar bancos dos clientes) ===
POSTGRES_MASTER_HOST=seu-postgres-host.com
POSTGRES_MASTER_PORT=5432
POSTGRES_MASTER_USER=postgres
POSTGRES_MASTER_PASSWORD=sua_senha_master
POSTGRES_MASTER_DB=postgres

# === Stripe (já configurado automaticamente pela Manus) ===
# STRIPE_SECRET_KEY - já injetado
# STRIPE_PUBLISHABLE_KEY - já injetado
# STRIPE_WEBHOOK_SECRET - já injetado
```

### Passo 2: Reiniciar o Servidor

Após configurar as variáveis de ambiente, reinicie o servidor para aplicar as mudanças:

```bash
# Se estiver rodando localmente
pnpm dev

# Se estiver em produção
pnpm build && pnpm start
```

---

## Integração com Stripe

O Stripe gerencia os pagamentos e assinaturas dos seus clientes.

### Passo 1: Criar Produtos no Stripe Dashboard

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Clique em **"+ Add product"**
3. Crie cada plano que você quer oferecer

**Exemplo de Plano Básico:**
- **Nome:** Plano Básico
- **Descrição:** Ideal para pequenas empresas
- **Pricing:** Recurring → Monthly
- **Preço:** R$ 99,00 (ou 9900 centavos)

4. Após criar, **copie o Price ID** (começa com `price_...`)

### Passo 2: Atualizar os Planos no Código

Edite o arquivo `server/products.ts` e atualize com seus Price IDs do Stripe:

```typescript
export const STRIPE_PRODUCTS = {
  BASIC: {
    priceId: "price_1234567890ABCDEF",  // ← Cole seu Price ID aqui
    name: "Plano Básico",
    // ...
  },
  PRO: {
    priceId: "price_ABCDEF1234567890",  // ← Cole seu Price ID aqui
    name: "Plano Profissional",
    // ...
  },
};
```

### Passo 3: Inserir Planos no Banco de Dados

Execute este SQL no banco de dados da plataforma (não nos bancos dos clientes):

```sql
INSERT INTO plans (name, description, stripePriceId, priceMonthly, maxWorkflowExecutions, maxConversations, maxStorageGB, isActive)
VALUES 
('Plano Básico', 'Ideal para pequenas empresas', 'price_1234567890ABCDEF', 9900, 1000, 500, 5, 1),
('Plano Profissional', 'Para empresas em crescimento', 'price_ABCDEF1234567890', 29900, 5000, 2000, 20, 1),
('Plano Enterprise', 'Recursos ilimitados', 'price_ENTERPRISE123', 99900, NULL, NULL, NULL, 1);
```

**Importante:** O campo `priceMonthly` deve ser em **centavos** (R$ 99,00 = 9900 centavos).

### Passo 4: Configurar Webhook do Stripe

1. Acesse [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em **"+ Add endpoint"**
3. **Endpoint URL:** `https://seu-dominio.com/api/stripe/webhook`
4. **Events to send:** Selecione:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Clique em **"Add endpoint"**
6. Copie o **Signing secret** (começa com `whsec_...`)
7. Adicione ao `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
```

---

## Integração com N8N

O N8N executa os workflows (agentes de IA) dos seus clientes.

### Passo 1: Obter API Key do N8N

1. Acesse sua instância do N8N
2. Vá em **Settings → API**
3. Gere uma nova API Key
4. Copie a API Key

### Passo 2: Criar Workflow Template

1. No N8N, crie um workflow que será o **template base** para todos os clientes
2. Este workflow deve incluir:
   - Nós de entrada (webhook, WhatsApp, etc.)
   - Lógica do agente de IA
   - Conexão com banco de dados (será substituído por cliente)
   - Nós de saída

3. **Importante:** Use **variáveis de ambiente** para dados que mudam por cliente:
   - `{{ $env.DB_HOST }}`
   - `{{ $env.DB_USER }}`
   - `{{ $env.DB_PASSWORD }}`
   - `{{ $env.DB_NAME }}`
   - `{{ $env.AGENT_PROMPT }}`

4. Após criar o workflow, copie o **Workflow ID** (aparece na URL: `/workflow/123`)

### Passo 3: Configurar Variáveis de Ambiente

Adicione ao `.env`:

```bash
N8N_API_URL=https://seu-n8n.exemplo.com
N8N_API_KEY=sua_api_key_aqui
N8N_TEMPLATE_WORKFLOW_ID=123
```

### Como Funciona a Clonagem

Quando você cria um cliente, o sistema:
1. Faz uma cópia do workflow template
2. Substitui as variáveis de ambiente com dados específicos do cliente
3. Ativa o workflow automaticamente
4. Retorna o Workflow ID do cliente para armazenar no banco

---

## Configuração do PostgreSQL Master

O PostgreSQL Master é usado para **criar bancos de dados isolados** para cada cliente.

### Requisitos

Você precisa de um servidor PostgreSQL com:
- Acesso remoto habilitado
- Usuário com permissões de `CREATEDB` e `CREATEROLE`
- Porta acessível pela plataforma

### Passo 1: Configurar Usuário Master

No seu servidor PostgreSQL, crie um usuário com permissões adequadas:

```sql
CREATE USER saas_master WITH PASSWORD 'senha_super_segura';
ALTER USER saas_master CREATEDB;
ALTER USER saas_master CREATEROLE;
```

### Passo 2: Habilitar Acesso Remoto

Edite o arquivo `postgresql.conf`:

```conf
listen_addresses = '*'
```

Edite o arquivo `pg_hba.conf` e adicione:

```conf
host    all    saas_master    0.0.0.0/0    md5
```

Reinicie o PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Passo 3: Configurar Variáveis de Ambiente

Adicione ao `.env`:

```bash
POSTGRES_MASTER_HOST=seu-postgres-host.com
POSTGRES_MASTER_PORT=5432
POSTGRES_MASTER_USER=saas_master
POSTGRES_MASTER_PASSWORD=senha_super_segura
POSTGRES_MASTER_DB=postgres
```

### Como Funciona o Provisionamento de Banco

Quando você cria um cliente, o sistema:
1. Conecta ao PostgreSQL Master
2. Cria um novo banco de dados: `tenant_<id>_<slug>`
3. Cria um usuário específico para o cliente
4. Configura permissões isoladas
5. Cria as tabelas necessárias (chat_messages, clientes, etc.)
6. Retorna as credenciais para o cliente usar no N8N

---

## Criando seu Primeiro Cliente

Agora que tudo está configurado, vamos criar o primeiro cliente!

### Passo 1: Acessar o Painel Administrativo

1. Faça login na plataforma
2. Você será redirecionado para `/admin` (painel administrativo)
3. Clique em **"Clientes"** no menu lateral

### Passo 2: Criar Novo Cliente

1. Clique no botão **"+ Novo Cliente"**
2. Preencha o formulário:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Nome da Empresa** | Nome do cliente | "Imobiliária São Paulo" |
| **Email** | Email do responsável | "contato@imobiliaria.com" |
| **Subdomínio** | Prefixo único para acesso | "imobiliaria-sp" |
| **Plano** | Selecione o plano de assinatura | "Plano Profissional" |

3. Clique em **"Criar Cliente"**

### Passo 3: O que Acontece Automaticamente

Após clicar em "Criar Cliente", o sistema executa:

1. **Criação do Tenant no Banco**
   - Registra o cliente na tabela `tenants`
   - Status inicial: `pending`

2. **Provisionamento do Banco de Dados**
   - Cria banco PostgreSQL isolado
   - Cria usuário e senha únicos
   - Cria tabelas necessárias
   - Armazena credenciais na tabela `tenant_db_credentials`

3. **Clonagem do Workflow N8N**
   - Clona o workflow template
   - Substitui variáveis de ambiente
   - Configura credenciais do banco
   - Ativa o workflow
   - Armazena Workflow ID na tabela `tenant_workflows`

4. **Criação de Sessão de Checkout Stripe**
   - Cria Customer no Stripe
   - Gera sessão de checkout com o plano selecionado
   - Retorna URL de pagamento

5. **Notificação ao Proprietário**
   - Envia notificação informando sobre o novo cliente

### Passo 4: Cliente Realiza Pagamento

1. Você recebe a **URL de checkout** do Stripe
2. Envie esta URL para o cliente
3. Cliente preenche dados de pagamento
4. Stripe processa e ativa a assinatura
5. Webhook atualiza status do tenant para `active`

### Passo 5: Cliente Acessa o Painel

1. Cliente acessa: `https://seu-dominio.com/client`
2. Faz login com o email cadastrado
3. Acessa o painel do cliente
4. Pode configurar o agente e visualizar métricas

---

## Como Funciona o Provisionamento

Aqui está um diagrama do fluxo completo:

```
[Admin cria cliente]
        ↓
[Sistema cria registro no banco]
        ↓
[Provisiona PostgreSQL] ────→ Cria banco isolado
        ↓                      Cria usuário/senha
        ↓                      Cria tabelas
        ↓
[Clona Workflow N8N] ────→ Copia template
        ↓                   Substitui variáveis
        ↓                   Ativa workflow
        ↓
[Cria Checkout Stripe] ────→ Gera sessão de pagamento
        ↓                     Retorna URL
        ↓
[Cliente paga]
        ↓
[Webhook Stripe] ────→ Ativa assinatura
        ↓                Atualiza status
        ↓
[Cliente ativo! 🎉]
```

### Tabelas Principais

**tenants** - Informações dos clientes
```sql
id, companyName, email, subdomain, status, planId, createdAt
```

**tenant_db_credentials** - Credenciais do banco de cada cliente
```sql
tenantId, host, port, database, username, password
```

**tenant_workflows** - Workflows N8N de cada cliente
```sql
tenantId, n8nWorkflowId, workflowName, isActive
```

**subscriptions** - Assinaturas Stripe
```sql
tenantId, stripeSubscriptionId, status, currentPeriodEnd
```

---

## Gerenciamento de Planos e Assinaturas

### Visualizar Planos

1. Acesse **"Planos"** no menu administrativo
2. Visualize todos os planos cadastrados
3. Veja detalhes de recursos e preços

### Ativar/Desativar Planos

- Planos **ativos** aparecem para seleção ao criar cliente
- Planos **inativos** não podem ser selecionados

### Atualizar Plano de um Cliente

Atualmente, a atualização de plano deve ser feita via:
1. Portal do Cliente Stripe (cliente faz upgrade/downgrade)
2. SQL direto no banco (admin atualiza manualmente)

**Exemplo SQL:**
```sql
UPDATE tenants 
SET planId = 2  -- ID do novo plano
WHERE id = 1;   -- ID do cliente
```

---

## Monitoramento e Logs

### Dashboard Administrativo

Acesse `/admin` para visualizar:
- **Total de Clientes** cadastrados
- **Clientes Ativos** (com assinatura ativa)
- **Clientes Suspensos** (pagamento falhou)
- **Eventos Recentes** da plataforma

### Página de Logs

Acesse `/admin/logs` para:
- Visualizar histórico completo de eventos
- Filtrar por quantidade (25, 50, 100, 200 eventos)
- Ver detalhes e metadados de cada evento
- Identificar erros e warnings

**Tipos de Eventos:**
- `tenant_created` - Novo cliente criado
- `tenant_suspended` - Cliente suspenso por falta de pagamento
- `payment_failed` - Falha de pagamento
- `workflow_provisioned` - Workflow N8N provisionado
- `database_provisioned` - Banco de dados criado

### Métricas do Cliente

Cada cliente pode visualizar suas próprias métricas em `/client/metrics`:
- Execuções de workflow no mês
- Conversas realizadas
- Uso de armazenamento
- Limites do plano

---

## Solução de Problemas

### Erro ao Criar Cliente

**Problema:** "Failed to provision database"

**Solução:**
1. Verifique se as credenciais do PostgreSQL Master estão corretas
2. Teste a conexão manualmente:
```bash
psql -h POSTGRES_MASTER_HOST -U POSTGRES_MASTER_USER -d postgres
```
3. Verifique se o usuário tem permissões de CREATEDB
4. Confira os logs em `/admin/logs`

---

**Problema:** "Failed to clone N8N workflow"

**Solução:**
1. Verifique se a API Key do N8N está correta
2. Teste a API manualmente:
```bash
curl -H "X-N8N-API-KEY: sua_api_key" https://seu-n8n.com/api/v1/workflows
```
3. Confirme que o Workflow Template ID existe
4. Verifique se o N8N está acessível pela plataforma

---

### Webhook do Stripe Não Funciona

**Problema:** Assinatura não ativa após pagamento

**Solução:**
1. Acesse [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique no webhook criado
3. Veja a aba "Events" para verificar se eventos estão chegando
4. Confira se o endpoint está correto: `/api/stripe/webhook`
5. Verifique se o `STRIPE_WEBHOOK_SECRET` está configurado
6. Teste manualmente reenviando um evento no Stripe

---

### Cliente Não Consegue Acessar o Painel

**Problema:** Cliente não vê suas informações

**Solução:**
1. Verifique se o email do cliente está cadastrado corretamente
2. Cliente deve fazer login com o **mesmo email** usado no cadastro
3. Verifique se o tenant está com status `active`
4. Confira se a assinatura foi ativada no Stripe

---

### Workflow N8N Não Executa

**Problema:** Agente não responde

**Solução:**
1. Acesse o N8N e verifique se o workflow do cliente está **ativo**
2. Teste o workflow manualmente no N8N
3. Verifique se as credenciais do banco estão corretas no workflow
4. Confira os logs de execução no N8N
5. Verifique se as variáveis de ambiente foram substituídas corretamente

---

## Próximos Passos

Agora que você entende como tudo funciona, recomendo:

1. **Criar um cliente de teste** para validar todo o fluxo
2. **Testar o pagamento** no modo de teste do Stripe
3. **Configurar o workflow template** com sua lógica de negócio
4. **Personalizar os planos** de acordo com seu modelo de negócio
5. **Configurar domínio personalizado** para a plataforma

---

## Suporte

Se tiver dúvidas ou problemas:
1. Consulte os **Logs** em `/admin/logs`
2. Verifique as **variáveis de ambiente**
3. Teste as **integrações** individualmente
4. Revise este guia

**Boa sorte com sua plataforma SaaS! 🚀**
