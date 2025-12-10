# 🚀 Configurar Webhook Stripe com ngrok (AGORA)

## ✅ Passo 1: Copiar URL do ngrok

Sua URL do ngrok é:
```
https://historical-orthopedically-zana.ngrok-free.dev
```

⚠️ **IMPORTANTE**: Mantenha o ngrok rodando! Se fechar, a URL muda.

---

## ✅ Passo 2: Atualizar Webhook no Stripe

1. Acesse: https://dashboard.stripe.com/webhooks
2. **Se já tem um webhook criado:**
   - Clique no webhook existente
   - Clique em **"..."** (três pontos) → **"Update endpoint"**
   - Altere a URL para: `https://historical-orthopedically-zana.ngrok-free.dev/api/webhooks/stripe`
   - Clique em **"Update endpoint"**

3. **Se não tem webhook:**
   - Clique em **"Add endpoint"**
   - **Endpoint URL**: `https://historical-orthopedically-zana.ngrok-free.dev/api/webhooks/stripe`
   - **Description**: "SaaS Agentes - ngrok"
   - **Events**: Selecione `checkout.session.completed`
   - Clique em **"Add endpoint"**

4. **Copiar o Signing secret:**
   - No webhook criado/atualizado, clique em **"Reveal"** no **Signing secret**
   - Copie o secret (começa com `whsec_...`)

---

## ✅ Passo 3: Atualizar .env

Abra o arquivo `.env` e adicione/atualize:

```env
# Stripe
STRIPE_SANDBOX_SECRET_KEY=sk_test_SUA_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_SUA_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_SEU_WEBHOOK_SECRET_AQUI

# URL (pode deixar localhost para desenvolvimento)
VITE_APP_URL=http://localhost:3000
```

**Substitua:**
- `whsec_SEU_WEBHOOK_SECRET_AQUI` → O secret que você copiou do Stripe

---

## ✅ Passo 4: Verificar se Servidor está Rodando

No terminal onde você roda o servidor, execute:

```powershell
# Verificar se está rodando na porta 3000
netstat -ano | findstr :3000
```

Se não estiver rodando, inicie:

```powershell
cd C:\Users\gesta\Desktop\saas
$env:NODE_ENV="development"; pnpm exec tsx watch server/_core/index.ts
```

---

## ✅ Passo 5: Testar Webhook

### Teste 1: Verificar se endpoint está acessível

Abra outro terminal e execute:

```powershell
curl https://historical-orthopedically-zana.ngrok-free.dev/api/webhooks/stripe
```

Deve retornar algo (mesmo que erro de método).

### Teste 2: Enviar evento de teste do Stripe

1. No Stripe Dashboard → **Webhooks** → Seu webhook
2. Clique em **"Send test webhook"**
3. Selecione evento: `checkout.session.completed`
4. Clique em **"Send test webhook"**
5. **Verifique os logs do servidor Node.js** - deve aparecer:
   ```
   [Stripe Webhook] ===== WEBHOOK RECEIVED =====
   [Stripe Webhook] Received event: checkout.session.completed
   ```

---

## ✅ Passo 6: Testar Checkout Real

1. Acesse: `http://localhost:3000`
2. Clique em **"Assinar"** em um plano
3. Use cartão teste: `4242 4242 4242 4242`
4. Complete o pagamento
5. **Verifique os logs do servidor** - deve criar o tenant automaticamente

---

## ⚠️ IMPORTANTE: ngrok Free tem Limitações

- A URL muda toda vez que você reinicia o ngrok
- Se fechar o ngrok, precisa atualizar o webhook no Stripe novamente
- Para produção, use domínio próprio com proxy reverso

---

## 🎯 Checklist Rápido

- [ ] ngrok rodando (não fechar!)
- [ ] Webhook atualizado no Stripe com URL do ngrok
- [ ] Webhook secret copiado e no `.env`
- [ ] Servidor Node.js rodando na porta 3000
- [ ] Teste do webhook funcionando
- [ ] Logs mostrando recebimento do webhook

---

**Vamos fazer isso agora!** 🚀

