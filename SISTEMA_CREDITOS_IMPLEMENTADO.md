# ✅ Sistema de Créditos Implementado

## 📋 Resumo

Sistema completo de rastreamento de consumo e créditos implementado com:
- **Rastreamento real** de todos os nodes OpenAI no N8N
- **Cálculo de custo real** baseado em preços parametrizáveis
- **Conversão para créditos internos** com margem de lucro configurável
- **Separação de visão**: Admin vê custo real (USD), Cliente vê créditos

---

## 🗄️ Estrutura de Banco de Dados

### Tabelas Criadas:

1. **`usageTransactions`** - Histórico detalhado de cada uso
   - `operation`: 'chat', 'audio', 'image', 'format', 'pdf'
   - `model`: Modelo OpenAI usado
   - `tokensInput`, `tokensOutput`, `totalTokens`
   - `costUSD`: Custo real em USD
   - `creditsUsed`: Créditos internos consumidos

2. **`tenantCredits`** - Saldo de créditos por tenant
   - `currentCredits`: Saldo atual
   - `totalCreditsPurchased`: Total comprado
   - `totalCreditsUsed`: Total usado
   - `totalCreditsBonus`: Bônus e resets mensais

3. **`openaiPricing`** - Preços parametrizáveis dos modelos
   - `priceInputPer1M`: USD por 1M tokens input
   - `priceOutputPer1M`: USD por 1M tokens output
   - `pricePerMinute`: Para Whisper (por minuto)

4. **`creditConfig`** - Configuração de conversão
   - `creditValueUSD`: Valor de 1 crédito em USD (padrão: 0.002)
   - `markupMultiplier`: Multiplicador de margem (padrão: 1.5 = 50%)
   - `minCreditsPerTransaction`: Mínimo por transação

### Tabelas Atualizadas:

- **`plans`**: Adicionado `monthlyCredits` (créditos mensais do plano)
- **`usageMetrics`**: Adicionados campos de tokens e custos por tipo de operação

---

## 🔧 Arquivos Criados/Modificados

### Novos Arquivos:

1. **`SQL_SISTEMA_CREDITOS.sql`** - Script de migração do banco
2. **`server/credit-system.ts`** - Lógica de cálculo e conversão
3. **`SISTEMA_CREDITOS_IMPLEMENTADO.md`** - Esta documentação

### Arquivos Modificados:

1. **`drizzle/schema.ts`** - Adicionadas novas tabelas
2. **`server/webhooks/n8n.ts`** - Adicionado handler `usage_tracking`
3. **`server/routers.ts`** - Adicionadas rotas tRPC para consultar consumo

---

## 🔄 Fluxo de Funcionamento

### 1. Rastreamento no N8N

**O que precisa ser feito no N8N:**
- Adicionar node "Code" após cada chamada OpenAI
- Capturar `usage` da resposta da API
- Enviar para webhook: `POST /api/webhooks/n8n/:tenantId`

**Exemplo de payload:**
```json
{
  "eventType": "usage_tracking",
  "data": {
    "operation": "chat",
    "model": "gpt-4o-mini",
    "tokensInput": 150,
    "tokensOutput": 200,
    "totalTokens": 350,
    "metadata": {
      "workflowId": "...",
      "nodeName": "OpenAI Chat Model"
    }
  }
}
```

### 2. Processamento no Backend

1. **Webhook recebe dados** (`server/webhooks/n8n.ts`)
2. **Calcula custo real** (`server/credit-system.ts::calculateCost`)
   - Busca preço do modelo em `openaiPricing`
   - Calcula: `(tokensInput / 1M) * priceInput + (tokensOutput / 1M) * priceOutput`
3. **Converte para créditos** (`server/credit-system.ts::costToCredits`)
   - Aplica margem de lucro configurável
   - Exemplo: $0.001 USD → 1 crédito (com markup 1.5x)
4. **Registra transação** (`server/credit-system.ts::recordUsageTransaction`)
   - Salva em `usageTransactions`
   - Atualiza `tenantCredits`
   - Atualiza `usageMetrics` (agregação mensal)

### 3. Consulta de Dados

**Cliente (vê créditos):**
- `trpc.metrics.getMyCredits` - Saldo atual
- `trpc.metrics.getMyUsageTransactions` - Histórico (mostra créditos)
- `trpc.metrics.getMyMonthlyConsumption` - Consumo do mês (em créditos)

**Admin (vê custo real):**
- `trpc.metrics.getTenantCredits` - Saldo atual
- `trpc.metrics.getTenantUsageTransactions` - Histórico (mostra USD)
- `trpc.metrics.getTenantMonthlyConsumption` - Consumo do mês (em USD)

---

## ⚙️ Configuração

### Preços OpenAI (Tabela `openaiPricing`)

Já inseridos no SQL:
- GPT-4o: $2.50 input / $10.00 output
- GPT-4o-mini: $0.15 input / $0.60 output
- GPT-5, GPT-5.2: $2.50 input / $10.00 output
- Whisper-1: $0.006 por minuto
- E outros modelos...

**Para atualizar preços:**
```sql
UPDATE "openaiPricing" 
SET "priceInputPer1M" = 2.50, "priceOutputPer1M" = 10.00
WHERE "model" = 'gpt-4o';
```

### Conversão de Créditos (Tabela `creditConfig`)

**Configurações padrão:**
- `creditValueUSD`: 0.002 (1 crédito = $0.002 USD)
- `markupMultiplier`: 1.5 (50% de margem)
- `minCreditsPerTransaction`: 1

**Exemplo de cálculo:**
- Custo real: $0.001 USD
- Créditos: `($0.001 / $0.002) * 1.5 = 0.75 → 1 crédito` (arredondado para cima)

**Para ajustar margem:**
```sql
UPDATE "creditConfig" 
SET "configValue" = '2.0'  -- 100% de margem
WHERE "configKey" = 'markupMultiplier';
```

---

## 📊 Próximos Passos

### 1. Implementar no N8N (CRÍTICO)

Adicionar nodes "Code" após cada chamada OpenAI para enviar dados de uso:

**Exemplo para node "OpenAI Chat Model":**
```javascript
// Node Code após OpenAI Chat Model
const usage = $input.item.json.usage || {};
const model = $input.item.json.model || 'gpt-4o-mini';

return {
  json: {
    ...$input.item.json,
    usageData: {
      operation: 'chat',
      model: model,
      tokensInput: usage.prompt_tokens || 0,
      tokensOutput: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      metadata: {
        workflowId: $workflow.id,
        nodeName: $node.name
      }
    }
  }
};
```

Depois, adicionar node "HTTP Request" para enviar ao webhook:
- URL: `{{ $env.BACKEND_URL }}/api/webhooks/n8n/{{ $env.TENANT_ID }}`
- Method: POST
- Body: 
```json
{
  "eventType": "usage_tracking",
  "data": "={{ $json.usageData }}"
}
```

### 2. Reset Mensal de Créditos

Criar job agendado (cron) para resetar créditos mensais:
```typescript
// server/jobs/reset-monthly-credits.ts
async function resetMonthlyCredits() {
  const tenants = await db.getAllActiveTenants();
  for (const tenant of tenants) {
    const plan = await db.getPlanById(tenant.currentPlanId);
    if (plan?.monthlyCredits) {
      await db.updateTenantCredits(tenant.id, {
        currentCredits: plan.monthlyCredits,
        lastResetDate: new Date(),
      });
    }
  }
}
```

### 3. Dashboard Frontend

Criar componentes React para:
- Exibir saldo de créditos
- Gráficos de consumo
- Histórico de transações
- Alertas de limite

---

## 🎯 Benefícios

1. **Controle Financeiro Preciso**
   - Rastreamento real de todos os custos
   - Margem de lucro configurável
   - Histórico completo para auditoria

2. **Transparência para Cliente**
   - Vê consumo em créditos (não vê custo real)
   - Breakdown por tipo de operação
   - Previsão de esgotamento

3. **Flexibilidade**
   - Preços atualizáveis sem código
   - Margem ajustável
   - Planos com diferentes limites

4. **Escalabilidade**
   - Suporta múltiplos modelos
   - Agregação eficiente
   - Indexação otimizada

---

## ⚠️ Importante

**O sistema está implementado no backend, mas precisa:**
1. ✅ Executar SQL de migração (`SQL_SISTEMA_CREDITOS.sql`)
2. ⚠️ **Adicionar nodes no N8N** para enviar dados de uso (CRÍTICO)
3. ⚠️ Criar dashboard frontend para visualização
4. ⚠️ Implementar reset mensal de créditos

**Sem o passo 2, o sistema não funcionará!**

