# 📋 Passo a Passo - Implementação de Créditos com Planos

## ✅ PASSO 1: Atualizar Planos no Banco

**Arquivo criado:** `SQL_ATUALIZAR_CREDITOS_PLANOS.sql`

**O que fazer:**
1. Execute o script SQL no seu banco PostgreSQL
2. Isso vai adicionar/atualizar o campo `monthlyCredits` em cada plano

**Valores sugeridos:**
- Plano Básico (R$ 99,00): 10.000 créditos
- Plano Pro (R$ 199,00): 50.000 créditos  
- Plano Enterprise (R$ 499,00): 200.000 créditos

**Como executar:**
```bash
# No EasyPanel ou via psql
psql -U usuario -d banco -f SQL_ATUALIZAR_CREDITOS_PLANOS.sql
```

---

## ✅ PASSO 2: Atribuir Créditos na Assinatura

**Arquivo modificado:** `server/webhooks/stripe.ts`

**O que foi feito:**
- Quando um tenant é criado via checkout do Stripe, os créditos mensais são atribuídos automaticamente
- A função `provisionTenantFromCheckout` agora:
  1. Busca o plano pelo `stripePriceId`
  2. Verifica se o plano tem `monthlyCredits`
  3. Cria ou atualiza o registro de créditos do tenant

**Status:** ✅ Implementado

---

## ✅ PASSO 3: Atribuir Créditos na Renovação Mensal

**Arquivo modificado:** `server/stripe-webhook.ts`

**O que foi feito:**
- Quando uma fatura é paga (`invoice.paid`), os créditos mensais são atribuídos novamente
- Isso garante que o tenant receba créditos a cada renovação mensal

**Status:** ✅ Implementado

---

## 🔄 PRÓXIMOS PASSOS

### PASSO 4: Reset Mensal Automático

**Opção A: Job agendado (recomendado)**
- Criar um job que roda no primeiro dia do mês
- Reseta créditos para o valor do plano

**Opção B: Verificação no primeiro uso**
- Quando tenant usa créditos, verificar se é novo mês
- Se for, resetar créditos

**Qual você prefere?** Vou implementar a Opção A (job agendado).

---

### PASSO 5: Atualizar Interface de Planos

**O que fazer:**
- Mostrar créditos mensais incluídos na página de planos
- Atualizar componentes do frontend

**Status:** ⏳ Aguardando sua escolha

---

## 🧪 TESTE

**Para testar:**
1. Execute o script SQL para atualizar os planos
2. Crie uma nova assinatura via Stripe
3. Verifique se os créditos foram atribuídos
4. Aguarde uma renovação mensal ou simule um `invoice.paid`
5. Verifique se os créditos foram atribuídos novamente

---

## 📝 RESUMO DO QUE FOI FEITO

✅ Script SQL para atualizar `monthlyCredits` nos planos
✅ Atribuição de créditos no checkout do Stripe
✅ Atribuição de créditos na renovação mensal
✅ Função `getPlanByStripePriceId` no `db.ts`
✅ Logs detalhados de atribuição de créditos

**Próximo:** Reset mensal automático (PASSO 4)

