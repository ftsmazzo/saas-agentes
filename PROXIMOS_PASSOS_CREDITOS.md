# 🎯 Próximos Passos - Sistema de Créditos

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

### 1. **Infraestrutura Completa** ✅
- ✅ Tabelas de banco de dados (`tenantCredits`, `usageTransactions`, `openaiPricing`, `creditConfig`)
- ✅ Sistema de cálculo de custos e conversão para créditos
- ✅ Registro de transações de uso
- ✅ Atribuição de créditos na assinatura inicial
- ✅ Atribuição de créditos na renovação mensal (invoice.paid)
- ✅ Reset mensal agendado (via `setTimeout` no `server/_core/index.ts`)
- ✅ Compra de créditos extras
- ✅ Frontend mostra créditos (Metrics, Subscription)

---

## 🔴 PRIORIDADE CRÍTICA - Bloquear Uso Sem Créditos

### Problema Atual
O sistema **deduz créditos APÓS processar**, permitindo uso mesmo sem créditos suficientes.

### Solução
**Adicionar verificação ANTES de processar uso no N8N.**

**Onde:** `server/webhooks/n8n.ts` → função `handleUsageTracking`

**O que fazer:**
1. Verificar créditos disponíveis ANTES de processar
2. Se insuficiente, retornar erro (não processar)
3. N8N deve tratar erro e não executar workflow

**Código necessário:**
```typescript
// Em server/webhooks/n8n.ts
import { checkCreditsAvailable, calculateCost } from '../credit-system';

async function handleUsageTracking(tenantId: number, payload: any) {
  try {
    const usageData: UsageData = payload.data;

    // VALIDAÇÃO: Verificar créditos ANTES de processar
    const estimatedCredits = await estimateCreditsForUsage(usageData);
    const hasCredits = await checkCreditsAvailable(tenantId, estimatedCredits);
    
    if (!hasCredits) {
      const credits = await getTenantCredits(tenantId);
      console.warn(`[N8N Webhook] ⚠️ Créditos insuficientes para tenant ${tenantId}. Saldo: ${credits.currentCredits}, Necessário: ~${estimatedCredits}`);
      
      // Retornar erro para N8N
      throw new Error(`INSUFFICIENT_CREDITS: Saldo insuficiente (${credits.currentCredits} créditos disponíveis, ~${estimatedCredits} necessários)`);
    }

    // Calcular custo e créditos
    const costCalculation = await calculateCost(usageData);
    
    // Registrar transação (já verifica e deduz)
    await recordUsageTransaction(tenantId, usageData, costCalculation);
    
    // ... resto do código
  }
}
```

**Função auxiliar necessária:**
```typescript
// Em server/credit-system.ts
export async function estimateCreditsForUsage(usageData: UsageData): Promise<number> {
  // Estimar créditos baseado no tipo de operação e modelo
  // Usar valores conservadores (maior estimativa)
  const costCalculation = await calculateCost(usageData);
  return costCalculation.creditsUsed;
}
```

**Status:** ❌ **NÃO IMPLEMENTADO** - CRÍTICO

---

## 🟡 PRIORIDADE ALTA - Melhorias de UX

### 2. **Alertas de Créditos Baixos** 🟡

**O que fazer:**
- Mostrar alerta no frontend quando créditos < 20%
- Mostrar alerta crítico quando créditos < 10%
- Bloquear interface quando créditos = 0

**Onde:**
- `client/src/pages/client/Metrics.tsx`
- `client/src/pages/client/Subscription.tsx`
- Adicionar componente de alerta reutilizável

**Status:** ❌ **NÃO IMPLEMENTADO**

---

### 3. **Melhorar Visualização de Histórico** 🟡

**O que fazer:**
- Adicionar filtros (por data, tipo de operação, modelo)
- Adicionar paginação
- Adicionar gráficos de consumo ao longo do tempo
- Exportar histórico (CSV/PDF)

**Onde:**
- `client/src/pages/client/Metrics.tsx`
- Adicionar novas queries tRPC se necessário

**Status:** ⚠️ **PARCIAL** - Histórico existe mas pode melhorar

---

### 4. **Dashboard Admin - Gerenciar Créditos** 🟡

**O que fazer:**
- Página admin para ver créditos de todos os tenants
- Página admin para ajustar créditos manualmente
- Dashboard com métricas agregadas (total de créditos, uso total, custos)
- Gráficos comparativos

**Onde:**
- Criar `client/src/pages/admin/Credits.tsx`
- Adicionar rotas tRPC: `admin.credits.*`

**Status:** ❌ **NÃO IMPLEMENTADO**

---

## 🟢 PRIORIDADE MÉDIA - Otimizações

### 5. **Verificar Reset Mensal** 🟢

**Status Atual:**
- ✅ Job existe (`server/jobs/monthly-credits-reset.ts`)
- ✅ Está agendado no `server/_core/index.ts` (via `setTimeout`)
- ⚠️ **MAS:** Reset é **SUBSTITUIÇÃO** (não adiciona, substitui créditos)

**Problema Potencial:**
- Reset **substitui** créditos para o valor do plano
- Se tenant comprou créditos extras, eles são perdidos no reset

**Decisão Necessária:**
1. Reset **substitui** créditos (atual) - mais simples, mas perde créditos extras
2. Reset **adiciona** créditos mensais (mantém extras) - mais complexo, precisa rastrear "mês base"

**Recomendação:** Manter como está (substitui), mas adicionar log claro de que extras serão perdidos.

**Status:** ✅ **IMPLEMENTADO** - Mas precisa decidir comportamento

---

### 6. **Otimizar Queries de Créditos** 🟢

**O que fazer:**
- Cache de saldo de créditos (Redis?)
- Índices no banco para consultas frequentes
- Agregação pré-calculada de métricas mensais

**Status:** ⚠️ **FUNCIONANDO** - Mas pode otimizar

---

### 7. **Notificações por Email** 🟢

**O que fazer:**
- Email quando créditos < 20%
- Email quando créditos = 0
- Email quando reset mensal acontece
- Email resumo mensal de uso

**Onde:**
- `server/email.ts` - Adicionar templates
- `server/credit-system.ts` - Adicionar lógica de notificação

**Status:** ❌ **NÃO IMPLEMENTADO**

---

## 📋 RESUMO DE PRIORIDADES

### 🔴 CRÍTICO (Fazer Agora)
1. **Bloquear uso sem créditos** - Verificar antes de processar no N8N

### 🟡 ALTA (Próxima Sprint)
2. **Alertas de créditos baixos** - UX no frontend
3. **Melhorar histórico** - Filtros, gráficos, exportação
4. **Dashboard admin** - Gerenciar créditos manualmente

### 🟢 MÉDIA (Backlog)
5. **Verificar reset mensal** - Decidir comportamento (substitui vs adiciona)
6. **Otimizar queries** - Cache, índices
7. **Notificações por email** - Alertas automáticos

---

## 🎯 PRÓXIMO PASSO RECOMENDADO

**Começar com #1 (Bloquear uso sem créditos)** pois é crítico para o funcionamento correto do sistema.

**Tempo estimado:** 2-3 horas

**Arquivos a modificar:**
- `server/webhooks/n8n.ts` - Adicionar verificação
- `server/credit-system.ts` - Adicionar função de estimativa (se necessário)
- Testar com N8N workflow

---

**Data:** 2026-01-06
**Status:** Aguardando decisão sobre próximos passos

