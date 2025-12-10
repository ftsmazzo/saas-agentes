# ⚡ Resumo Rápido: Configurar Stripe

## 🎯 Passos Essenciais (5 minutos)

### 1. Criar Conta Stripe
- Acesse: https://dashboard.stripe.com/register
- Ative modo **Test mode**

### 2. Obter Chaves
- **Developers** → **API keys**
- Copie: `Publishable key` (pk_test_...) e `Secret key` (sk_test_...)

### 3. Configurar Webhook
- **Developers** → **Webhooks** → **Add endpoint**
- URL: `https://sua-url.com/api/webhooks/stripe` (use ngrok para local)
- Eventos: `checkout.session.completed`
- Copie o **Signing secret** (whsec_...)

### 4. Usar ngrok (para testes locais)
```bash
# Instalar: https://ngrok.com/download
ngrok http 3000
# Copiar URL HTTPS gerada
```

### 5. Atualizar .env
```env
STRIPE_SANDBOX_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6. Criar Produtos no Stripe
- **Products** → **Add product**
- Criar preço recorrente
- Copiar **Price ID** (price_...)
- Atualizar no banco: `UPDATE plans SET stripePriceId = 'price_...' WHERE id = X;`

### 7. Testar
- Acesse landing page
- Clique em "Assinar"
- Use cartão teste: `4242 4242 4242 4242`
- Verifique logs do servidor

## 🧪 Cartões de Teste

- ✅ Sucesso: `4242 4242 4242 4242`
- ❌ Recusado: `4000 0000 0000 0002`
- 🔐 3D Secure: `4000 0025 0000 3155`

## 📍 Endpoint do Webhook

O webhook está configurado em:
- `/api/webhooks/stripe` (principal)
- `/api/stripe/webhook` (alternativo)

## ⚠️ Importante

- Use **ngrok** ou servidor público para webhook funcionar
- O webhook precisa de URL pública (localhost não funciona)
- Sempre use o **webhook secret** específico (não o API secret)

---

📖 **Guia completo**: Veja `GUIA_STRIPE_COMPLETO.md` para detalhes

