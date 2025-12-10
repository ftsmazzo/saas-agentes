# 🔍 Debug: Webhook Recebido mas Falhando

## ✅ O que está funcionando:
- ✅ ngrok está recebendo (mostra 200 OK)
- ✅ Webhook está chegando no servidor
- ✅ Evento tem dados corretos (`checkout.session.completed`)

## ❌ O problema:
- ❌ Stripe marca como "Malsucedida"
- ❌ Resposta: "Sem dados"

Isso indica que o servidor está recebendo, mas:
1. Não está retornando resposta correta, OU
2. Está dando erro no processamento, OU
3. Validação de assinatura está falhando

---

## 🔧 Verificações Imediatas

### 1. Verificar Logs do Servidor Node.js

No terminal onde o servidor está rodando, você deve ver:

```
[Stripe Webhook] ===== WEBHOOK RECEIVED =====
[Stripe Webhook] Received event: checkout.session.completed
[Stripe Webhook] Processing checkout.session.completed
[Provisioning] Creating tenant for...
```

**Se NÃO aparecer nada:**
- O webhook não está chegando no servidor
- Verifique se o servidor está rodando na porta 3000

**Se aparecer ERRO:**
- Copie o erro completo e me mostre

### 2. Verificar Webhook Secret

No arquivo `.env`, verifique:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**IMPORTANTE:**
- Deve ser o secret do webhook específico (não o API secret)
- Copie novamente do Stripe Dashboard → Webhooks → Seu webhook → Signing secret

### 3. Verificar se Servidor está Rodando

```powershell
# Verificar se está na porta 3000
netstat -ano | findstr :3000
```

Se não estiver, inicie:

```powershell
cd C:\Users\gesta\Desktop\saas
$env:NODE_ENV="development"; pnpm exec tsx watch server/_core/index.ts
```

---

## 🧪 Teste Manual

### Teste 1: Verificar Endpoint

Abra outro terminal e execute:

```powershell
curl -X POST https://historical-orthopedically-zana.ngrok-free.dev/api/webhooks/stripe -H "Content-Type: application/json" -d "{\"test\":\"data\"}"
```

Deve retornar algo (mesmo que erro de assinatura).

### Teste 2: Verificar Logs em Tempo Real

No terminal do servidor, você deve ver logs quando o webhook chegar.

---

## 🔍 Possíveis Causas

### Causa 1: Webhook Secret Incorreto

**Sintoma:** Erro de validação de assinatura

**Solução:**
1. No Stripe Dashboard → Webhooks → Seu webhook
2. Clique em "Reveal" no Signing secret
3. Copie o secret completo
4. Atualize no `.env`
5. Reinicie o servidor

### Causa 2: Erro no Processamento

**Sintoma:** Webhook chega mas falha ao processar

**Solução:**
- Verifique os logs do servidor
- Procure por erros relacionados a:
  - Banco de dados
  - Evolution API
  - N8N
  - Email

### Causa 3: Resposta Incorreta

**Sintoma:** Servidor processa mas não retorna 200

**Solução:**
- O código deve retornar `res.status(200).json({ verified: true })`
- Verifique se não há erro antes de retornar

---

## 📋 Checklist de Debug

- [ ] Servidor Node.js está rodando?
- [ ] Logs aparecem quando webhook chega?
- [ ] Webhook secret está correto no `.env`?
- [ ] Servidor está na porta 3000?
- [ ] ngrok está rodando e apontando para porta 3000?
- [ ] URL do webhook no Stripe está correta?

---

## 🎯 Próximos Passos

1. **Verifique os logs do servidor** - me mostre o que aparece quando o webhook chega
2. **Verifique o webhook secret** - copie novamente do Stripe
3. **Teste enviando evento de teste** do Stripe Dashboard
4. **Me mostre os logs completos** do servidor

---

**Me mostre os logs do servidor quando o webhook chegar!** 🔍

