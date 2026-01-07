# Correção: Créditos Extras Comprados Não Apareciam no Saldo

## Problema Identificado

O usuário reportou que:
- O `currentCredits` no banco estava gravado apenas com os créditos mensais (sem os extras comprados)
- Os créditos comprados só apareciam em `totalCreditsPurchased`, mas não eram refletidos no saldo disponível

## Causa Raiz

O problema estava na lógica do **reset mensal de créditos** (`monthly-credits-reset.ts`):

1. Quando créditos extras eram comprados, eles eram adicionados ao `currentCredits` e ao `totalCreditsPurchased`
2. Mas quando o reset mensal acontecia, ele calculava os extras como: `Math.max(0, currentCreditsBeforeReset - monthlyCredits)`
3. **Problema**: Se o tenant já havia usado créditos, o `currentCredits` poderia estar menor que `monthlyCredits`, fazendo com que os extras fossem perdidos no reset!

## Solução Implementada

### 1. Nova Coluna `extrasPurchased`

Adicionada uma coluna específica na tabela `tenantCredits` para rastrear **apenas os créditos extras comprados** (separados dos créditos mensais):

```sql
ALTER TABLE "tenantCredits" 
ADD COLUMN "extrasPurchased" INTEGER DEFAULT 0;
```

### 2. Atualização em `handleExtraCreditsPurchase`

Quando créditos extras são comprados, agora incrementamos também a coluna `extrasPurchased`:

```typescript
extrasPurchased: sql`${tenantCredits.extrasPurchased} + ${creditsToAdd}`
```

### 3. Correção no Reset Mensal

O reset mensal agora usa diretamente a coluna `extrasPurchased` ao invés de tentar calcular:

```typescript
const extrasPurchased = existingCredits[0].extrasPurchased || 0;
const newCurrentCredits = monthlyCredits + extrasPurchased;
```

Isso garante que os extras comprados sejam **sempre preservados** no reset mensal.

### 4. Simplificação em `getMyCredits`

A rota `metrics.getMyCredits` agora usa diretamente `extrasPurchased` da coluna, eliminando cálculos complexos e possíveis erros.

## Migração Necessária

**IMPORTANTE**: É necessário executar a migração SQL antes do deploy:

```sql
-- Arquivo: drizzle/0015_add_extrasPurchased_to_tenantCredits.sql
```

A migração:
- Adiciona a coluna `extrasPurchased` se não existir
- Inicializa com valor `0` para registros existentes
- A partir de agora, os extras comprados serão rastreados corretamente

## Como Funciona Agora

1. **Compra de Créditos Extras**:
   - Incrementa `currentCredits` ✅
   - Incrementa `totalCreditsPurchased` ✅
   - Incrementa `extrasPurchased` ✅ (NOVO)

2. **Reset Mensal**:
   - Preserva `extrasPurchased` ✅
   - Reseta `currentCredits = monthlyCredits + extrasPurchased` ✅

3. **Exibição no Frontend**:
   - `currentCredits` já reflete mensais + extras - usados ✅
   - `extrasPurchased` mostra exatamente quantos extras foram comprados ✅

## Arquivos Modificados

1. `drizzle/schema.ts` - Adicionada coluna `extrasPurchased`
2. `drizzle/0015_add_extrasPurchased_to_tenantCredits.sql` - Migração SQL
3. `server/webhooks/stripe.ts` - Atualizado `handleExtraCreditsPurchase`
4. `server/jobs/monthly-credits-reset.ts` - Corrigido reset mensal
5. `server/routers.ts` - Simplificado `getMyCredits`

## Próximos Passos

1. ✅ Código commitado e enviado para o repositório
2. ⏳ **Executar migração SQL no banco de dados** (antes ou durante o deploy)
3. ⏳ Fazer deploy no EasyPanel
4. ⏳ Testar compra de créditos extras e verificar se aparecem no saldo
5. ⏳ Testar reset mensal e verificar se extras são preservados

## Nota Importante

Para tenants que já compraram créditos extras antes desta correção:
- A coluna `extrasPurchased` será inicializada com `0`
- Os créditos extras já comprados podem não ser preservados no próximo reset mensal
- **Solução**: Ajustar manualmente `extrasPurchased` para esses tenants se necessário

