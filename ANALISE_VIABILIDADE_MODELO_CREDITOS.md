# 📊 Análise de Viabilidade: Seleção de Modelo e Sistema de Créditos

## 🎯 Objetivos

1. **Automatizar escolha de modelo no N8N** - Permitir seleção de modelo (GPT-4, GPT-3.5, etc.) e aplicar automaticamente no workflow
2. **Sistema de créditos/conversas** - Criar sistema de controle baseado em consumo real da OpenAI, com "conversão" para créditos no frontend

---

## ✅ 1. AUTOMATIZAÇÃO DE SELEÇÃO DE MODELO NO N8N

### **Viabilidade: ✅ TOTALMENTE VIÁVEL**

### **Análise Técnica:**

#### **Como funciona atualmente:**
- O workflow N8N tem nodes do tipo `@n8n/n8n-nodes-langchain.lmChatOpenAi`
- O modelo está hardcoded como `"gpt-4.1-mini"` no JSON do workflow
- Existem múltiplos nodes com esse modelo (linhas 35, 1457 do workflow)

#### **Como implementar:**

**Opção 1: Via API N8N (Recomendada) ✅**
```typescript
// Já temos função similar em server/n8n-integration.ts
export async function updateModelInWorkflow(
  workflowId: string,
  model: string // 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', etc.
): Promise<boolean> {
  // 1. Buscar workflow atual
  const workflow = await n8nApi.get(`/workflows/${workflowId}`);
  
  // 2. Atualizar todos os nodes do tipo lmChatOpenAi
  workflow.nodes = workflow.nodes.map((node: any) => {
    if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
      node.parameters.model = model;
    }
    return node;
  });
  
  // 3. Salvar workflow atualizado
  await n8nApi.put(`/workflows/${workflowId}`, workflow);
}
```

**Opção 2: Via Variável de Ambiente do Workflow**
- N8N permite variáveis de ambiente por workflow
- Podemos usar `={{ $env.MODEL_NAME }}` no node
- Atualizar via API: `workflow.settings.env = { MODEL_NAME: 'gpt-4o' }`

**Opção 3: Via Expressão Dinâmica (Mais Flexível)**
- Usar expressão N8N: `={{ $json.model || 'gpt-4o-mini' }}`
- Passar modelo via webhook/contexto
- Mais complexo, mas permite mudança em tempo real

#### **Estrutura de Dados Necessária:**

**1. Adicionar campo no `agentConfigs`:**
```sql
ALTER TABLE "agentConfigs" ADD COLUMN "openaiModel" VARCHAR(50) DEFAULT 'gpt-4o-mini';
```

**2. Interface no Frontend:**
- Seletor de modelo similar ao seletor de imagens
- Opções: GPT-4o, GPT-4o-mini, GPT-3.5-turbo, etc.
- Mostrar custo estimado por modelo
- Salvar preferência por agente

**3. Sincronização:**
- Quando salvar configuração, atualizar workflow N8N automaticamente
- Usar função `syncAgentConfigToN8N` existente

#### **Modelos Suportados (OpenAI):**
- `gpt-4o` - Mais poderoso, mais caro
- `gpt-4o-mini` - Balanceado
- `gpt-4-turbo` - Versão anterior
- `gpt-3.5-turbo` - Mais barato, menos poderoso
- `o1-preview` - Raciocínio avançado
- `o1-mini` - Raciocínio básico

#### **Complexidade de Implementação:**
- **Backend:** ⭐⭐ (Médio) - Já temos estrutura similar
- **Frontend:** ⭐ (Baixo) - Seletor simples
- **N8N:** ⭐ (Baixo) - Apenas atualizar parâmetro
- **Tempo estimado:** 4-6 horas

---

## ✅ 2. SISTEMA DE CRÉDITOS/CONVERSAS

### **Viabilidade: ✅ TOTALMENTE VIÁVEL (com algumas considerações)**

### **Análise Técnica:**

#### **Arquitetura Proposta:**

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Real)                       │
├─────────────────────────────────────────────────────────┤
│ 1. Rastrear consumo real da OpenAI                     │
│    - Tokens de entrada (input)                         │
│    - Tokens de saída (output)                          │
│    - Custo por modelo (tabela de preços)               │
│    - Timestamp de cada chamada                          │
│                                                          │
│ 2. Calcular custo real:                                 │
│    Custo = (input_tokens * preço_input) +              │
│            (output_tokens * preço_output)              │
│                                                          │
│ 3. Armazenar em tabela de consumo:                     │
│    - usageMetrics (já existe)                          │
│    - Adicionar: tokens, custo_real, modelo_usado      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE CONVERSÃO                        │
├─────────────────────────────────────────────────────────┤
│ 1. Definir "moeda" de créditos:                        │
│    - 1 crédito = X tokens (ex: 1000 tokens)             │
│    - Ou: 1 crédito = R$ 0,01                            │
│    - Ou: 1 conversa = Y créditos                        │
│                                                          │
│ 2. Converter consumo real → créditos:                  │
│    Créditos_usados = (custo_real / preço_por_crédito)  │
│                                                          │
│ 3. Calcular limites baseados em plano:                │
│    - Plano Starter: 10.000 créditos/mês                │
│    - Plano Pro: 50.000 créditos/mês                    │
│    - Plano Enterprise: Ilimitado                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (Exibição)                        │
├─────────────────────────────────────────────────────────┤
│ 1. Dashboard de consumo:                                │
│    - Créditos disponíveis: 8.500 / 10.000              │
│    - Conversas este mês: 234                            │
│    - Tokens consumidos: 1.2M                            │
│    - Custo estimado: R$ 45,00                           │
│                                                          │
│ 2. Gráficos e métricas:                                 │
│    - Consumo por dia/semana/mês                         │
│    - Top modelos utilizados                             │
│    - Previsão de esgotamento                            │
│                                                          │
│ 3. Alertas e limites:                                   │
│    - Alerta em 80% do limite                            │
│    - Bloqueio automático em 100%                        │
│    - Opção de comprar créditos extras                  │
└─────────────────────────────────────────────────────────┘
```

#### **Estrutura de Banco de Dados:**

**1. Expandir `usageMetrics`:**
```sql
ALTER TABLE "usageMetrics" ADD COLUMN "tokensInput" INTEGER DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "tokensOutput" INTEGER DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "costReal" DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "modelUsed" VARCHAR(50);
ALTER TABLE "usageMetrics" ADD COLUMN "creditsUsed" INTEGER DEFAULT 0;
```

**2. Nova tabela `creditTransactions`:**
```sql
CREATE TABLE "creditTransactions" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "type" VARCHAR(20) NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
  "amount" INTEGER NOT NULL, -- Quantidade de créditos
  "description" TEXT,
  "metadata" TEXT, -- JSON com detalhes
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**3. Nova tabela `tenantCredits`:**
```sql
CREATE TABLE "tenantCredits" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL UNIQUE,
  "currentCredits" INTEGER DEFAULT 0,
  "totalCreditsPurchased" INTEGER DEFAULT 0,
  "totalCreditsUsed" INTEGER DEFAULT 0,
  "lastResetDate" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**4. Atualizar `plans`:**
```sql
ALTER TABLE "plans" ADD COLUMN "monthlyCredits" INTEGER DEFAULT 10000;
ALTER TABLE "plans" ADD COLUMN "creditPrice" DECIMAL(10, 4); -- Preço por crédito
```

#### **Rastreamento de Consumo:**

**1. Interceptar chamadas OpenAI:**

**Opção A: No N8N (Recomendada) ✅**
- Adicionar node após cada chamada OpenAI
- Capturar `usage` da resposta da API
- Enviar para webhook do backend

**Opção B: No Backend (Alternativa)**
- Se fizermos chamadas diretas (como no `generateSystemPrompt`)
- Já temos acesso ao `usage` da resposta

**2. Estrutura de dados da resposta OpenAI:**
```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

**3. Cálculo de custo:**
```typescript
// Tabela de preços OpenAI (por 1M tokens)
const PRICING = {
  'gpt-4o': { input: 2.50, output: 10.00 }, // USD por 1M tokens
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1-preview': { input: 15.00, output: 60.00 },
};

function calculateCost(usage: Usage, model: string): number {
  const pricing = PRICING[model];
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
```

**4. Conversão para créditos:**
```typescript
// Exemplo: 1 crédito = R$ 0,01 (ou $0.002 USD)
const CREDIT_VALUE_USD = 0.002;

function costToCredits(costUSD: number): number {
  return Math.ceil(costUSD / CREDIT_VALUE_USD);
}
```

#### **Interface no Frontend:**

**1. Dashboard de Créditos:**
```typescript
// Componente: CreditDashboard.tsx
- Barra de progresso: Créditos usados / Total
- Gráfico de consumo diário
- Lista de transações recentes
- Botão "Comprar Créditos Extras"
```

**2. Seletor de Modelo com Custo:**
```typescript
// Componente: ModelSelector.tsx
- Mostrar cada modelo com:
  - Nome e descrição
  - Custo estimado por 1K tokens
  - Ícone/indicador visual
  - Badge "Recomendado" ou "Econômico"
```

**3. Alertas e Notificações:**
- Toast quando atingir 80% do limite
- Email quando atingir 90%
- Bloqueio automático em 100%

#### **Controle de Limites:**

**1. Middleware de verificação:**
```typescript
// Antes de cada chamada OpenAI
async function checkCredits(tenantId: number, estimatedCost: number): Promise<boolean> {
  const credits = await db.getTenantCredits(tenantId);
  const plan = await db.getPlanByTenantId(tenantId);
  
  // Verificar créditos disponíveis
  if (credits.currentCredits < estimatedCost) {
    throw new Error('Créditos insuficientes');
  }
  
  // Verificar limite mensal do plano
  const monthlyUsage = await db.getMonthlyUsage(tenantId);
  if (monthlyUsage.totalCredits >= plan.monthlyCredits) {
    throw new Error('Limite mensal atingido');
  }
  
  return true;
}
```

**2. Dedução pós-uso:**
```typescript
// Após chamada bem-sucedida
async function deductCredits(tenantId: number, actualCost: number) {
  await db.updateTenantCredits(tenantId, {
    currentCredits: { decrement: actualCost },
    totalCreditsUsed: { increment: actualCost }
  });
  
  await db.createCreditTransaction({
    tenantId,
    type: 'usage',
    amount: -actualCost,
    description: 'Uso de créditos em chamada OpenAI'
  });
}
```

#### **Reset Mensal:**

```typescript
// Job agendado (cron)
async function resetMonthlyCredits() {
  const tenants = await db.getAllActiveTenants();
  
  for (const tenant of tenants) {
    const plan = await db.getPlanByTenantId(tenantId);
    
    // Adicionar créditos do plano
    await db.updateTenantCredits(tenantId, {
      currentCredits: plan.monthlyCredits,
      lastResetDate: new Date()
    });
    
    // Registrar transação
    await db.createCreditTransaction({
      tenantId,
      type: 'bonus',
      amount: plan.monthlyCredits,
      description: 'Créditos mensais do plano'
    });
  }
}
```

#### **Complexidade de Implementação:**

- **Backend:** ⭐⭐⭐ (Alto) - Requer rastreamento detalhado
- **Frontend:** ⭐⭐ (Médio) - Dashboard e gráficos
- **N8N:** ⭐⭐ (Médio) - Adicionar nodes de rastreamento
- **Banco de Dados:** ⭐⭐ (Médio) - Novas tabelas e migrações
- **Tempo estimado:** 12-16 horas

---

## 🎯 RECOMENDAÇÕES

### **Prioridade 1: Seleção de Modelo** ⭐⭐⭐
- **Por quê:** Mais simples, impacto imediato
- **Benefício:** Cliente escolhe qualidade vs custo
- **Implementação:** 4-6 horas

### **Prioridade 2: Sistema de Créditos** ⭐⭐⭐
- **Por quê:** Diferencial competitivo, controle financeiro
- **Benefício:** Transparência, previsibilidade, upselling
- **Implementação:** 12-16 horas (pode ser em fases)

### **Faseamento Sugerido:**

**Fase 1 (Semana 1):**
- ✅ Seleção de modelo no frontend
- ✅ Salvar preferência no banco
- ✅ Sincronizar com N8N

**Fase 2 (Semana 2):**
- ✅ Rastreamento básico de consumo
- ✅ Tabela de créditos
- ✅ Dashboard simples

**Fase 3 (Semana 3):**
- ✅ Cálculo preciso de custos
- ✅ Limites e bloqueios
- ✅ Reset mensal

**Fase 4 (Semana 4):**
- ✅ Compras de créditos extras
- ✅ Gráficos avançados
- ✅ Alertas e notificações

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### **1. Preços OpenAI:**
- Preços mudam periodicamente
- Manter tabela atualizável
- Considerar cache de preços

### **2. Taxa de Câmbio:**
- OpenAI cobra em USD
- Converter para BRL no frontend
- Atualizar diariamente

### **3. Margem de Lucro:**
- Adicionar markup nos créditos
- Exemplo: Custo real $0.10 → Vender por $0.15
- Definir estratégia de precificação

### **4. Escalabilidade:**
- Muitas transações de créditos
- Indexar `tenantId` e `createdAt`
- Considerar agregações periódicas

### **5. Auditoria:**
- Manter histórico completo
- Permitir exportação de relatórios
- Transparência para o cliente

---

## ✅ CONCLUSÃO

**Ambas as funcionalidades são TOTALMENTE VIÁVEIS!**

- **Seleção de Modelo:** Implementação direta, baixa complexidade
- **Sistema de Créditos:** Mais complexo, mas traz grande valor

**Recomendação:** Implementar em fases, começando pela seleção de modelo e depois evoluindo para o sistema completo de créditos.

