# 🎯 Estratégia de Controle de Consumo e Métricas

## 📊 Problema Atual

- Não há controle granular de consumo por tipo de operação
- Impossível calcular custos reais e prever limites
- Nodes de áudio/imagem podem ter modelos diferentes do principal
- Sem métricas internas para calcular tokens

---

## ✅ Solução Proposta: Sistema Híbrido de Controle

### **Opção 1: Controle Total (Recomendada para SaaS Profissional)**

#### **Arquitetura:**

```
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE CONTROLE NO N8N                  │
├─────────────────────────────────────────────────────────┤
│ 1. Interceptar TODAS as chamadas OpenAI                │
│    - Agente principal (conversa)                        │
│    - Transcrição de áudio (Whisper)                     │
│    - Análise de imagem (Vision)                         │
│    - Formatação de resposta                             │
│                                                          │
│ 2. Capturar dados de uso:                               │
│    - Tokens de entrada (input)                          │
│    - Tokens de saída (output)                           │
│    - Modelo usado                                       │
│    - Tipo de operação (chat/audio/image)                │
│    - Timestamp                                          │
│                                                          │
│ 3. Enviar para webhook do backend:                      │
│    POST /api/webhooks/n8n/:tenantId                     │
│    {                                                     │
│      eventType: "usage_tracking",                       │
│      data: {                                            │
│        operation: "chat" | "audio" | "image",           │
│        model: "gpt-4o",                                 │
│        tokensInput: 150,                                │
│        tokensOutput: 200,                               │
│        costUSD: 0.001                                   │
│      }                                                   │
│    }                                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              BACKEND - CÁLCULO E ARMAZENAMENTO          │
├─────────────────────────────────────────────────────────┤
│ 1. Receber dados de uso                                 │
│ 2. Calcular custo real baseado em tabela de preços     │
│ 3. Converter para créditos (moeda interna)              │
│ 4. Armazenar em tabelas:                                │
│    - usageMetrics (agregação mensal)                    │
│    - usageTransactions (histórico detalhado)           │
│    - tenantCredits (saldo atual)                        │
│ 5. Verificar limites e bloquear se necessário          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              FRONTEND - VISUALIZAÇÃO                    │
├─────────────────────────────────────────────────────────┤
│ 1. Dashboard de consumo:                                │
│    - Créditos usados / Total                            │
│    - Breakdown por tipo (chat/audio/image)              │
│    - Gráficos de consumo diário                         │
│    - Previsão de esgotamento                            │
│                                                          │
│ 2. Painel Admin:                                        │
│    - Consumo por tenant                                 │
│    - Cálculo de margem de lucro                         │
│    - Relatórios detalhados                              │
└─────────────────────────────────────────────────────────┘
```

#### **Implementação no N8N:**

**Node após cada chamada OpenAI:**
```javascript
// Node Code após OpenAI Chat Model
const usage = $input.item.json.usage || {};
const model = $input.item.json.model || 'gpt-4o-mini';

// Calcular custo (tabela de preços)
const pricing = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'whisper-1': { input: 0.006 }, // Por minuto
  'gpt-4o-vision': { input: 2.50, output: 10.00 },
};

const cost = (
  (usage.prompt_tokens / 1_000_000) * pricing[model]?.input +
  (usage.completion_tokens / 1_000_000) * pricing[model]?.output
);

// Enviar para webhook
return {
  json: {
    ...$input.item.json,
    usageData: {
      operation: 'chat',
      model: model,
      tokensInput: usage.prompt_tokens || 0,
      tokensOutput: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      costUSD: cost,
      timestamp: new Date().toISOString()
    }
  }
};
```

**Webhook no Backend:**
```typescript
// server/webhooks/n8n.ts
case "usage_tracking":
  await handleUsageTracking(tenantId, payload.data);
  break;

async function handleUsageTracking(tenantId: number, data: any) {
  // Calcular créditos
  const credits = costToCredits(data.costUSD);
  
  // Deduzir créditos
  await db.updateTenantCredits(tenantId, {
    currentCredits: { decrement: credits },
    totalCreditsUsed: { increment: credits }
  });
  
  // Registrar transação
  await db.createUsageTransaction({
    tenantId,
    operation: data.operation,
    model: data.model,
    tokensInput: data.tokensInput,
    tokensOutput: data.tokensOutput,
    costUSD: data.costUSD,
    creditsUsed: credits
  });
}
```

---

### **Opção 2: Métricas Internas (Mais Simples, Menos Preciso)**

#### **Arquitetura:**

```
┌─────────────────────────────────────────────────────────┐
│              ESTIMATIVA BASEADA EM MÉTRICAS             │
├─────────────────────────────────────────────────────────┤
│ 1. Usar modelo fixo (gpt-4o-mini) em produção          │
│ 2. Estimar tokens baseado em:                           │
│    - Tamanho da mensagem (input)                        │
│    - Tamanho da resposta (output)                       │
│    - Tipo de operação                                   │
│                                                          │
│ 3. Calcular custo estimado:                             │
│    - Chat: ~1 token por caractere                       │
│    - Áudio: ~1 minuto = X tokens                        │
│    - Imagem: ~1000 tokens por imagem                    │
│                                                          │
│ 4. Converter para "créditos internos"                   │
│    - 1 crédito = 1000 tokens (exemplo)                  │
│    - Ou: 1 crédito = R$ 0,01                            │
└─────────────────────────────────────────────────────────┘
```

#### **Vantagens:**
- ✅ Mais simples de implementar
- ✅ Não depende de captura no N8N
- ✅ Funciona mesmo se webhook falhar

#### **Desvantagens:**
- ❌ Menos preciso
- ❌ Não reflete custos reais
- ❌ Pode ter discrepâncias

---

## 🎯 Recomendação: Opção 1 (Controle Total)

### **Por quê:**
1. **Precisão:** Cálculo baseado em dados reais da OpenAI
2. **Transparência:** Cliente vê exatamente o que está consumindo
3. **Controle:** Pode limitar por tipo de operação
4. **Upselling:** Mostrar breakdown incentiva upgrade de plano
5. **Auditoria:** Histórico completo para suporte

### **Fases de Implementação:**

#### **Fase 1: Rastreamento Básico (Semana 1)**
- ✅ Adicionar node Code após cada chamada OpenAI no N8N
- ✅ Capturar `usage` da resposta
- ✅ Enviar para webhook do backend
- ✅ Armazenar em `usageTransactions`

#### **Fase 2: Cálculo e Créditos (Semana 2)**
- ✅ Tabela de preços OpenAI (atualizável)
- ✅ Função de cálculo de custo
- ✅ Conversão para créditos
- ✅ Dedução automática

#### **Fase 3: Limites e Controle (Semana 3)**
- ✅ Verificação antes de cada chamada
- ✅ Bloqueio automático em limite
- ✅ Alertas em 80% e 90%
- ✅ Reset mensal

#### **Fase 4: Dashboard e Métricas (Semana 4)**
- ✅ Dashboard de consumo no frontend
- ✅ Breakdown por tipo (chat/audio/image)
- ✅ Gráficos e previsões
- ✅ Painel admin com relatórios

---

## 📋 Estrutura de Banco de Dados

### **Nova tabela `usageTransactions`:**
```sql
CREATE TABLE "usageTransactions" (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "operation" VARCHAR(20) NOT NULL, -- 'chat', 'audio', 'image', 'format'
  "model" VARCHAR(50) NOT NULL, -- 'gpt-4o', 'whisper-1', etc.
  "tokensInput" INTEGER DEFAULT 0,
  "tokensOutput" INTEGER DEFAULT 0,
  "totalTokens" INTEGER DEFAULT 0,
  "costUSD" DECIMAL(10, 6) DEFAULT 0,
  "creditsUsed" INTEGER DEFAULT 0,
  "metadata" TEXT, -- JSON com detalhes adicionais
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_usage_transactions_tenant ON "usageTransactions"("tenantId", "createdAt");
CREATE INDEX idx_usage_transactions_operation ON "usageTransactions"("operation");
```

### **Expandir `usageMetrics`:**
```sql
ALTER TABLE "usageMetrics" ADD COLUMN "tokensChat" INTEGER DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "tokensAudio" INTEGER DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "tokensImage" INTEGER DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "costChatUSD" DECIMAL(10, 6) DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "costAudioUSD" DECIMAL(10, 6) DEFAULT 0;
ALTER TABLE "usageMetrics" ADD COLUMN "costImageUSD" DECIMAL(10, 6) DEFAULT 0;
```

### **Nova tabela `openaiPricing`:**
```sql
CREATE TABLE "openaiPricing" (
  id SERIAL PRIMARY KEY,
  "model" VARCHAR(50) NOT NULL UNIQUE,
  "priceInputPer1M" DECIMAL(10, 4) NOT NULL, -- USD por 1M tokens input
  "priceOutputPer1M" DECIMAL(10, 4) NOT NULL, -- USD por 1M tokens output
  "pricePerMinute" DECIMAL(10, 4), -- Para Whisper (por minuto)
  "isActive" BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Inserir preços iniciais
INSERT INTO "openaiPricing" ("model", "priceInputPer1M", "priceOutputPer1M") VALUES
  ('gpt-4o', 2.50, 10.00),
  ('gpt-4o-mini', 0.15, 0.60),
  ('gpt-3.5-turbo', 0.50, 1.50),
  ('gpt-4o-vision', 2.50, 10.00),
  ('whisper-1', NULL, NULL, 0.006); -- Preço por minuto
```

---

## 🔧 Configuração de Modelos por Operação

### **Estratégia: Modelos Específicos por Função**

```typescript
// server/config/models.ts
export const MODEL_CONFIG = {
  // Modelo principal do agente (conversa)
  chat: {
    default: 'gpt-4o-mini',
    options: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    allowUserSelection: true, // Cliente pode escolher
  },
  
  // Transcrição de áudio (sempre Whisper)
  audio: {
    default: 'whisper-1',
    options: ['whisper-1'],
    allowUserSelection: false, // Fixo
  },
  
  // Análise de imagem (sempre Vision)
  image: {
    default: 'gpt-4o-vision',
    options: ['gpt-4o-vision', 'gpt-4o-mini-vision'],
    allowUserSelection: false, // Fixo ou opcional
  },
  
  // Formatação de resposta (pode usar mesmo do chat)
  format: {
    default: 'gpt-4o-mini',
    options: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    allowUserSelection: false, // Usa mesmo do chat
  },
};
```

### **Atualizar N8N baseado em configuração:**
```typescript
// Ao atualizar modelo do chat, atualizar também formatação
// Mas manter áudio e imagem com seus modelos específicos
```

---

## 💡 Alternativa: Modelo Único com Conversão

### **Estratégia Simplificada:**

1. **Usar apenas gpt-4o-mini em produção**
2. **Calcular consumo real** (tokens da API)
3. **Converter para "créditos"** baseado em preço do gpt-4o-mini
4. **Se cliente escolher gpt-4o no frontend:**
   - Mostrar "equivalente a X créditos de gpt-4o-mini"
   - Ou: aplicar multiplicador (gpt-4o = 10x mais caro)
   - Internamente usar gpt-4o-mini, mas cobrar como gpt-4o

**Vantagem:** Controle total, modelo único, fácil de gerenciar
**Desvantagem:** Cliente não recebe qualidade do modelo escolhido

---

## 🎯 Recomendação Final

**Implementar Opção 1 (Controle Total) com modelos específicos:**

1. ✅ Cliente escolhe modelo do chat (gpt-4o, gpt-4o-mini, etc)
2. ✅ Áudio sempre usa Whisper (fixo)
3. ✅ Imagem sempre usa Vision (fixo ou opcional)
4. ✅ Rastrear consumo de TODOS os nodes
5. ✅ Calcular custo real baseado em preços OpenAI
6. ✅ Converter para créditos internos
7. ✅ Dashboard mostra breakdown completo

**Isso permite:**
- Controle financeiro preciso
- Limites por tipo de operação
- Transparência para o cliente
- Upselling baseado em consumo
- Auditoria completa

---

## 📝 Próximos Passos

1. **Corrigir erro do `active` (já feito)**
2. **Decidir estratégia:** Controle Total ou Métricas Internas
3. **Implementar rastreamento no N8N**
4. **Criar tabelas de banco**
5. **Implementar cálculo de custos**
6. **Criar dashboard de consumo**

Qual estratégia você prefere? Posso começar implementando a Opção 1 (Controle Total).

