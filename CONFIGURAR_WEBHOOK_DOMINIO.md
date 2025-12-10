# 🌐 Configurar Webhook Stripe com Domínio Próprio

## ✅ O que você precisa fazer

### 1. URL do Webhook (CORRETO)

A URL completa será:
```
https://fabricadosdados.com.br/api/webhooks/stripe
```

⚠️ **ATENÇÃO**: É `/api/webhooks/stripe` (com "s" no plural), não `/api/webhook/stripe`

---

## 📋 Checklist Completo

### ✅ 1. Domínio Acessível Publicamente

- [ ] O domínio `fabricadosdados.com.br` está apontando para seu servidor?
- [ ] O servidor está acessível de fora (não apenas localhost)?
- [ ] O servidor está rodando na porta correta?

### ✅ 2. HTTPS Configurado (OBRIGATÓRIO)

O Stripe **exige HTTPS** para webhooks. Você precisa:

- [ ] Certificado SSL instalado (Let's Encrypt, Cloudflare, etc.)
- [ ] Domínio acessível via `https://fabricadosdados.com.br`
- [ ] Redirecionamento HTTP → HTTPS configurado

**Opções para HTTPS:**
- **Cloudflare** (gratuito, fácil)
- **Let's Encrypt** (gratuito, via Certbot)
- **Certificado do seu provedor**

### ✅ 3. Servidor Rodando e Acessível

- [ ] Servidor Node.js rodando
- [ ] Porta configurada (80 para HTTP, 443 para HTTPS)
- [ ] Firewall permitindo conexões na porta
- [ ] Teste: `curl https://fabricadosdados.com.br/api/webhooks/stripe` deve retornar algo (mesmo que erro)

### ✅ 4. Variáveis de Ambiente

No arquivo `.env`, configure:

```env
# Stripe
STRIPE_SANDBOX_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URL da aplicação (IMPORTANTE: use seu domínio)
VITE_APP_URL=https://fabricadosdados.com.br
```

### ✅ 5. Criar Webhook no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em **"Add endpoint"**
3. Preencha:
   - **Endpoint URL**: `https://fabricadosdados.com.br/api/webhooks/stripe`
   - **Description**: "SaaS Agentes - Provisionamento"
   - **Events**: Selecione `checkout.session.completed`
4. Clique em **"Add endpoint"**
5. **Copie o Signing secret** (whsec_...)
6. Adicione no `.env` como `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Testar Webhook

### Teste 1: Verificar se endpoint está acessível

```bash
curl https://fabricadosdados.com.br/api/webhooks/stripe
```

Deve retornar algo (mesmo que erro de método ou assinatura).

### Teste 2: Enviar evento de teste do Stripe

1. No Stripe Dashboard → Webhooks → Seu webhook
2. Clique em **"Send test webhook"**
3. Selecione evento: `checkout.session.completed`
4. Clique em **"Send test webhook"**
5. Verifique os logs do servidor

### Teste 3: Verificar logs do servidor

No terminal do servidor, você deve ver:
```
[Stripe Webhook] ===== WEBHOOK RECEIVED =====
[Stripe Webhook] Received event: checkout.session.completed
```

---

## ⚠️ Problemas Comuns

### ❌ "Webhook não recebido"

**Causas:**
- Domínio não acessível publicamente
- Firewall bloqueando
- Servidor não está rodando
- URL incorreta

**Solução:**
- Teste: `curl https://fabricadosdados.com.br/api/webhooks/stripe`
- Verifique se o servidor está rodando
- Verifique firewall/proxy

### ❌ "Signature verification failed"

**Causas:**
- `STRIPE_WEBHOOK_SECRET` incorreto
- Usou API secret em vez do webhook secret
- Webhook secret de outro webhook

**Solução:**
- Use o secret específico do webhook criado
- Copie novamente do Stripe Dashboard

### ❌ "Connection refused" ou "Timeout"

**Causas:**
- Servidor não está rodando
- Porta bloqueada
- DNS não configurado

**Solução:**
- Verifique se o servidor está rodando
- Verifique DNS: `nslookup fabricadosdados.com.br`
- Verifique firewall

---

## 🔒 Segurança

### Recomendações:

1. **Sempre use HTTPS** (Stripe exige)
2. **Valide assinatura do webhook** (já implementado no código)
3. **Use webhook secret** (não compartilhe)
4. **Monitore eventos** no Stripe Dashboard
5. **Configure logs** para debug

---

## 📝 Resumo Rápido

1. ✅ Certifique-se que `https://fabricadosdados.com.br` está acessível
2. ✅ Configure HTTPS (obrigatório)
3. ✅ Crie webhook no Stripe: `https://fabricadosdados.com.br/api/webhooks/stripe`
4. ✅ Copie o webhook secret e adicione no `.env`
5. ✅ Atualize `VITE_APP_URL=https://fabricadosdados.com.br` no `.env`
6. ✅ Teste enviando evento de teste do Stripe
7. ✅ Verifique logs do servidor

---

## 🎯 Próximo Passo

Após configurar tudo, teste fazendo um checkout real:
1. Acesse sua landing page
2. Clique em "Assinar"
3. Complete o pagamento com cartão teste
4. Verifique se o tenant foi criado automaticamente

---

**Boa sorte! 🚀**

