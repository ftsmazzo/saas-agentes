# 🎯 Guia Completo: Configurar Stripe do Zero

Este guia vai te ajudar a configurar o Stripe desde o início, incluindo webhook, para que tudo funcione perfeitamente.

## 📋 Pré-requisitos

- Conta no Stripe (vamos criar do zero)
- Servidor rodando localmente ou com URL pública (para webhook)
- Acesso ao arquivo `.env`

---

## 🚀 PASSO 1: Criar Conta no Stripe

### 1.1. Acessar Stripe

1. Acesse: https://dashboard.stripe.com/register
2. Crie uma conta (pode usar email pessoal)
3. Complete o cadastro básico

### 1.2. Ativar Modo Teste (Sandbox)

1. No dashboard do Stripe, verifique se está em **"Test mode"** (toggle no topo direito)
2. O modo teste permite testar sem cobranças reais

---

## 🔑 PASSO 2: Obter Chaves de API

### 2.1. Acessar Chaves de API

1. No dashboard do Stripe, vá em **"Developers"** → **"API keys"**
2. Você verá duas chaves:
   - **Publishable key** (começa com `pk_test_...`)
   - **Secret key** (começa com `sk_test_...`)

### 2.2. Copiar Chaves

1. **Publishable key**: Clique em "Reveal test key" e copie
2. **Secret key**: Clique em "Reveal test key" e copie

⚠️ **IMPORTANTE**: Nunca compartilhe a Secret key publicamente!

---

## 🌐 PASSO 3: Configurar Webhook (CRÍTICO)

### 3.1. Preparar URL do Webhook

O webhook precisa de uma URL pública. Você tem 3 opções:

#### Opção A: Usar ngrok (Recomendado para testes locais)

1. Instale o ngrok: https://ngrok.com/download
2. Execute: `ngrok http 3000`
3. Copie a URL HTTPS (ex: `https://abc123.ngrok.io`)
4. Use esta URL: `https://abc123.ngrok.io/api/webhooks/stripe`

#### Opção B: Usar servidor com domínio público

Se você tem um servidor com domínio:
- URL: `https://seu-dominio.com/api/webhooks/stripe`

#### Opção C: Usar Stripe CLI (Alternativa)

1. Instale Stripe CLI: https://stripe.com/docs/stripe-cli
2. Execute: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Isso cria um webhook local para testes

### 3.2. Criar Webhook no Stripe Dashboard

1. No Stripe Dashboard, vá em **"Developers"** → **"Webhooks"**
2. Clique em **"Add endpoint"**
3. Preencha:
   - **Endpoint URL**: `https://sua-url.com/api/webhooks/stripe` (ou URL do ngrok)
   - **Description**: "SaaS Agentes - Provisionamento de Tenants"
   - **Events to send**: Selecione **"Select events"**
4. Na lista de eventos, selecione:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created` (opcional)
   - ✅ `customer.subscription.updated` (opcional)
   - ✅ `customer.subscription.deleted` (opcional)
5. Clique em **"Add endpoint"**

### 3.3. Obter Webhook Secret

1. Após criar o webhook, clique nele
2. Na seção **"Signing secret"**, clique em **"Reveal"**
3. Copie o secret (começa com `whsec_...`)

⚠️ **IMPORTANTE**: Este secret é usado para validar que os webhooks vêm do Stripe!

---

## ⚙️ PASSO 4: Configurar Variáveis de Ambiente

### 4.1. Editar arquivo `.env`

Abra o arquivo `.env` na raiz do projeto e adicione:

```env
# Stripe - Modo Teste (Sandbox)
STRIPE_SANDBOX_SECRET_KEY=sk_test_SUA_SECRET_KEY_AQUI
STRIPE_PUBLISHABLE_KEY=pk_test_SUA_PUBLISHABLE_KEY_AQUI

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_SEU_WEBHOOK_SECRET_AQUI

# URL da aplicação (para redirects)
VITE_APP_URL=http://localhost:3000
```

### 4.2. Substituir Valores

- `sk_test_SUA_SECRET_KEY_AQUI` → Sua Secret key do Stripe
- `pk_test_SUA_PUBLISHABLE_KEY_AQUI` → Sua Publishable key do Stripe
- `whsec_SEU_WEBHOOK_SECRET_AQUI` → Seu Webhook secret

---

## 💰 PASSO 5: Criar Produtos e Preços no Stripe

### 5.1. Criar Produto

1. No Stripe Dashboard, vá em **"Products"** → **"Add product"**
2. Preencha:
   - **Name**: "Plano Básico" (ou nome do seu plano)
   - **Description**: "Plano básico do SaaS"
3. Clique em **"Save product"**

### 5.2. Criar Preço

1. No produto criado, clique em **"Add price"**
2. Configure:
   - **Pricing model**: "Recurring"
   - **Price**: Valor (ex: R$ 99,00)
   - **Billing period**: "Monthly" ou "Yearly"
   - **Currency**: BRL (ou USD)
3. Clique em **"Add price"**
4. **Copie o Price ID** (começa com `price_...`)

### 5.3. Repetir para Outros Planos

Crie produtos e preços para todos os planos que você oferece.

### 5.4. Atualizar Banco de Dados

Execute no banco de dados (ou via admin panel):

```sql
-- Atualizar planos com Price IDs do Stripe
UPDATE plans 
SET stripePriceId = 'price_XXXXX' 
WHERE id = 1; -- ID do plano

UPDATE plans 
SET stripePriceId = 'price_YYYYY' 
WHERE id = 2; -- ID do outro plano
```

---

## 🧪 PASSO 6: Testar Webhook

### 6.1. Usar Stripe CLI (Recomendado)

1. Instale Stripe CLI: https://stripe.com/docs/stripe-cli
2. Execute:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Isso vai mostrar o webhook secret no terminal
4. Use esse secret no `.env` temporariamente

### 6.2. Testar Evento Manualmente

1. No Stripe Dashboard, vá em **"Developers"** → **"Webhooks"**
2. Clique no seu webhook
3. Clique em **"Send test webhook"**
4. Selecione evento: `checkout.session.completed`
5. Clique em **"Send test webhook"**
6. Verifique os logs do servidor para ver se recebeu

### 6.3. Verificar Logs

No terminal do servidor, você deve ver:
```
[Stripe Webhook] ===== WEBHOOK RECEIVED =====
[Stripe Webhook] Received event: checkout.session.completed
[Stripe Webhook] Processing checkout.session.completed
[Provisioning] Creating tenant for...
```

---

## 🛒 PASSO 7: Testar Checkout Completo

### 7.1. Acessar Landing Page

1. Acesse: `http://localhost:3000`
2. Você deve ver os planos listados

### 7.2. Criar Checkout

1. Clique em "Assinar" em um plano
2. Você será redirecionado para o Stripe Checkout
3. Use cartão de teste:
   - **Número**: `4242 4242 4242 4242`
   - **Data**: Qualquer data futura (ex: 12/25)
   - **CVC**: Qualquer 3 dígitos (ex: 123)
   - **CEP**: Qualquer CEP válido

### 7.3. Completar Pagamento

1. Preencha o email no checkout
2. Complete o pagamento
3. Você será redirecionado de volta para a aplicação

### 7.4. Verificar Provisionamento

1. Verifique os logs do servidor
2. Deve aparecer:
   - Tenant criado
   - Evolution instance criada
   - N8N workflow criado
   - Email de ativação enviado

---

## 🔍 PASSO 8: Verificar e Depurar

### 8.1. Verificar Webhook no Stripe

1. No Stripe Dashboard, vá em **"Developers"** → **"Webhooks"**
2. Clique no seu webhook
3. Veja a aba **"Events"**
4. Verifique se os eventos estão sendo recebidos
5. Se houver erros, clique no evento para ver detalhes

### 8.2. Verificar Logs do Servidor

Procure por:
- `[Stripe Webhook] ===== WEBHOOK RECEIVED =====`
- `[Stripe Webhook] Received event: checkout.session.completed`
- `[Provisioning] Creating tenant for...`
- `[Provisioning] Tenant created with ID: X`

### 8.3. Problemas Comuns

#### Webhook não recebido

- ✅ Verifique se a URL está correta
- ✅ Verifique se o servidor está acessível publicamente (ngrok)
- ✅ Verifique se o webhook está ativo no Stripe
- ✅ Verifique os logs do Stripe Dashboard

#### Erro de assinatura (signature)

- ✅ Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- ✅ Use o secret do webhook específico (não o API secret)
- ✅ Se usar Stripe CLI, use o secret mostrado no terminal

#### Tenant não criado

- ✅ Verifique se `planId` está no metadata do checkout
- ✅ Verifique se o plano existe no banco de dados
- ✅ Verifique os logs de erro no servidor

---

## 📝 Checklist Final

Antes de considerar tudo configurado, verifique:

- [ ] Conta Stripe criada e em modo teste
- [ ] Chaves de API copiadas e no `.env`
- [ ] Webhook criado no Stripe Dashboard
- [ ] Webhook secret copiado e no `.env`
- [ ] URL do webhook configurada e acessível
- [ ] Produtos e preços criados no Stripe
- [ ] Price IDs atualizados no banco de dados
- [ ] Webhook testado e funcionando
- [ ] Checkout completo testado
- [ ] Tenant provisionado após pagamento

---

## 🎉 Próximos Passos

Após tudo funcionando:

1. **Testar com cartões diferentes**:
   - Sucesso: `4242 4242 4242 4242`
   - Recusado: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

2. **Ativar modo produção** (quando pronto):
   - Trocar para chaves de produção
   - Criar webhook de produção
   - Atualizar `.env` com chaves de produção

3. **Monitorar webhooks**:
   - Verificar eventos no Stripe Dashboard
   - Monitorar logs do servidor
   - Configurar alertas para erros

---

## 🆘 Suporte

Se tiver problemas:

1. Verifique os logs do servidor
2. Verifique os eventos no Stripe Dashboard
3. Use o Stripe CLI para testar localmente
4. Consulte a documentação: https://stripe.com/docs/webhooks

---

**Boa sorte! 🚀**

