# 💳 Integração de Créditos com Planos de Assinatura

## 📋 Situação Atual

### ✅ O que já está implementado:

1. **Tabela `plans`** tem campo `monthlyCredits` (créditos mensais incluídos)
2. **Tabela `tenantCredits`** gerencia saldo de créditos por tenant
3. **Sistema de cálculo** converte uso real em créditos
4. **ModelSelector** agora mostra créditos por modelo

---

## 🎯 O que precisa ser feito

### 1. **Atribuir Créditos ao Assinar Plano**

Quando um tenant assina um plano, precisa receber os créditos mensais:

**Onde fazer:**
- No webhook do Stripe quando assinatura é criada/atualizada
- Ou quando plano é atribuído manualmente

**Código necessário:**
```typescript
// Em server/webhooks/stripe.ts ou server/routers.ts

// Quando assinatura é criada/atualizada:
const plan = await db.getPlanByStripePriceId(stripePriceId);
if (plan?.monthlyCredits) {
  // Buscar ou criar registro de créditos
  const existingCredits = await db.getTenantCredits(tenantId);
  
  if (existingCredits) {
    // Adicionar créditos mensais ao saldo atual
    await db.update(tenantCredits)
      .set({
        currentCredits: sql`${tenantCredits.currentCredits} + ${plan.monthlyCredits}`,
        totalCreditsPurchased: sql`${tenantCredits.totalCreditsPurchased} + ${plan.monthlyCredits}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantCredits.tenantId, tenantId));
  } else {
    // Criar registro inicial
    await db.insert(tenantCredits).values({
      tenantId,
      currentCredits: plan.monthlyCredits,
      totalCreditsPurchased: plan.monthlyCredits,
    });
  }
}
```

---

### 2. **Reset Mensal Automático**

Implementar reset automático de créditos mensais:

**Opção A: Job agendado (recomendado)**
```typescript
// Criar job que roda no primeiro dia do mês
// server/jobs/monthly-credits-reset.ts

export async function resetMonthlyCredits() {
  const db = await getDb();
  const tenants = await db.select().from(tenants);
  
  for (const tenant of tenants) {
    const plan = await db.getPlanByTenantId(tenant.id);
    if (plan?.monthlyCredits) {
      // Resetar créditos para o valor do plano
      await db.update(tenantCredits)
        .set({
          currentCredits: plan.monthlyCredits,
          lastResetDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tenantCredits.tenantId, tenant.id));
    }
  }
}
```

**Opção B: Verificar no primeiro uso do mês**
- Quando tenant usa créditos, verificar se é novo mês
- Se for, resetar créditos

---

### 3. **Atualizar Planos no Banco**

Garantir que os planos tenham `monthlyCredits` configurados:

**SQL para atualizar planos existentes:**
```sql
-- Exemplo de valores (ajustar conforme necessário)
UPDATE plans 
SET "monthlyCredits" = CASE 
  WHEN id = 1 THEN 10000  -- Starter: 10k créditos
  WHEN id = 2 THEN 50000  -- Professional: 50k créditos
  WHEN id = 3 THEN 200000 -- Enterprise: 200k créditos
  ELSE 10000
END;
```

---

### 4. **Atualizar Interface de Planos**

No frontend, mostrar créditos mensais incluídos:

**Exemplo:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Plano Professional</CardTitle>
    <CardDescription>R$ 299,00/mês</CardDescription>
  </CardHeader>
  <CardContent>
    <ul>
      <li>✅ 50.000 créditos mensais incluídos</li>
      <li>✅ 5.000 execuções de workflow</li>
      <li>✅ 20.000 conversas</li>
      <li>✅ 20GB de armazenamento</li>
    </ul>
  </CardContent>
</Card>
```

---

## 📊 Estrutura de Créditos por Plano (Sugestão)

| Plano | Créditos Mensais | Preço Mensal | Créditos por R$ |
|-------|------------------|--------------|-----------------|
| Starter | 10.000 | R$ 99,00 | ~101 créditos/R$ |
| Professional | 50.000 | R$ 299,00 | ~167 créditos/R$ |
| Enterprise | 200.000 | R$ 799,00 | ~250 créditos/R$ |

**Nota:** Ajustar valores conforme sua estratégia de precificação.

---

## 🔄 Fluxo Completo

1. **Usuário assina plano** → Recebe créditos mensais
2. **Usuário usa agente** → Créditos são deduzidos
3. **Fim do mês** → Créditos são resetados para o valor do plano
4. **Se créditos acabarem** → Opção de comprar créditos extras ou aguardar reset

---

## ✅ Checklist de Implementação

- [ ] Atualizar webhook do Stripe para atribuir créditos
- [ ] Criar job de reset mensal (ou verificação no primeiro uso)
- [ ] Atualizar planos no banco com `monthlyCredits`
- [ ] Atualizar interface de planos para mostrar créditos
- [ ] Testar fluxo completo de assinatura → créditos → uso → reset
- [ ] Implementar compra de créditos extras (opcional)

---

## 💡 Próximos Passos

1. **Comprar créditos extras:** Permitir que usuários comprem créditos adicionais
2. **Alertas:** Notificar quando créditos estiverem baixos
3. **Limites:** Bloquear uso quando créditos acabarem
4. **Dashboard:** Mostrar gráficos de consumo e histórico

