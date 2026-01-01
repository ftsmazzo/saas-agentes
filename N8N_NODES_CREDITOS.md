# 📦 Nodes N8N para Rastreamento de Créditos

## 🎯 Estratégia de Implementação

Como alguns nodes LangChain não permitem inserir nodes depois, usamos **duas abordagens**:

1. **Nodes diretos OpenAI** → Adicionar node Code + HTTP Request depois
2. **LangChain Agent** → Capturar dados na saída do workflow ou usar node de agregação

---

## 📋 Cenário 1: Nodes OpenAI Diretos (Podem ter nodes depois)

### Exemplos:
- "OpenAI Chat Model" (não LangChain)
- "Message a model" (OpenAI direto)
- "Analyze image" (Vision)
- "Transcribe Recording" (Whisper)

### Implementação:

#### **Passo 1: Adicionar Node "Code" após o node OpenAI**

**Nome do node:** `Capturar Uso - [Nome do Node]`

**Código:**
```javascript
// Capturar dados de uso do node OpenAI anterior
const inputData = $input.item.json;

// Extrair informações de uso
const usage = inputData.usage || {};
const model = inputData.model || $node["OpenAI Chat Model"].json.model || 'gpt-4o-mini';

// Determinar tipo de operação baseado no nome do node anterior
let operation = 'chat';
const nodeName = $node["OpenAI Chat Model"].name || '';

if (nodeName.toLowerCase().includes('audio') || nodeName.toLowerCase().includes('transcribe') || nodeName.toLowerCase().includes('whisper')) {
  operation = 'audio';
  // Para Whisper, calcular duração se disponível
  const audioDuration = inputData.audioDurationSeconds || inputData.duration || 0;
  return {
    json: {
      ...inputData,
      usageData: {
        operation: 'audio',
        model: 'whisper-1',
        audioDurationSeconds: audioDuration,
        metadata: {
          workflowId: $workflow.id,
          nodeName: nodeName,
          executionId: $execution.id
        }
      }
    }
  };
}

if (nodeName.toLowerCase().includes('image') || nodeName.toLowerCase().includes('vision') || nodeName.toLowerCase().includes('analyze')) {
  operation = 'image';
}

if (nodeName.toLowerCase().includes('format') || nodeName.toLowerCase().includes('formatar')) {
  operation = 'format';
}

if (nodeName.toLowerCase().includes('pdf') || nodeName.toLowerCase().includes('extract')) {
  operation = 'pdf';
}

// Retornar dados de uso
return {
  json: {
    ...inputData,
    usageData: {
      operation: operation,
      model: model,
      tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      metadata: {
        workflowId: $workflow.id,
        nodeName: nodeName,
        executionId: $execution.id
      }
    }
  }
};
```

#### **Passo 2: Adicionar Node "HTTP Request" para enviar ao webhook**

**Nome do node:** `Registrar Uso - [Nome do Node]`

**Configuração:**
- **Method:** POST
- **URL:** `{{ $env.BACKEND_URL }}/api/webhooks/n8n/{{ $env.TENANT_ID }}`
  - Ou usar variável: `{{ $vars.BACKEND_URL }}/api/webhooks/n8n/{{ $vars.TENANT_ID }}`
- **Authentication:** None (ou Basic se necessário)
- **Body Content Type:** JSON
- **Body:**
```json
{
  "eventType": "usage_tracking",
  "data": "={{ $json.usageData }}",
  "timestamp": "={{ $now.toISO() }}"
}
```

**Importante:** 
- Marcar como **"Continue On Fail"** para não quebrar o workflow se o webhook falhar
- Não esperar resposta (não bloquear o fluxo)

---

## 📋 Cenário 2: LangChain Agent (NÃO pode ter nodes depois)

### Problema:
O node "OpenAI Chat Model" dentro de um LangChain Agent executa internamente e não permite inserir nodes depois.

### Solução: Capturar na saída do workflow ou usar node de agregação

#### **Opção A: Node de Agregação no Final do Workflow**

Adicionar um node "Code" que processa TODAS as saídas do workflow:

**Nome:** `Agregar e Registrar Uso`

**Código:**
```javascript
// Este node recebe dados de múltiplos pontos do workflow
// Processar todas as entradas e agregar uso

const allUsageData = [];

// Processar cada item de entrada
for (const item of $input.all()) {
  const data = item.json;
  
  // Verificar se tem dados de uso
  if (data.usageData) {
    allUsageData.push(data.usageData);
  }
  
  // Tentar extrair uso de respostas OpenAI diretas
  if (data.usage) {
    const usage = data.usage;
    const model = data.model || 'gpt-4o-mini';
    
    // Determinar operação baseado no contexto
    let operation = 'chat';
    if (data.operation) {
      operation = data.operation;
    } else if (data.nodeName) {
      const nodeName = data.nodeName.toLowerCase();
      if (nodeName.includes('audio') || nodeName.includes('whisper')) {
        operation = 'audio';
      } else if (nodeName.includes('image') || nodeName.includes('vision')) {
        operation = 'image';
      } else if (nodeName.includes('format')) {
        operation = 'format';
      } else if (nodeName.includes('pdf')) {
        operation = 'pdf';
      }
    }
    
    allUsageData.push({
      operation: operation,
      model: model,
      tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      metadata: {
        workflowId: $workflow.id,
        executionId: $execution.id,
        nodeName: data.nodeName || 'unknown'
      }
    });
  }
}

// Retornar dados agregados
return allUsageData.map(usage => ({
  json: {
    usageData: usage
  }
}));
```

Depois, adicionar node "HTTP Request" que envia cada item:
- **URL:** `{{ $env.BACKEND_URL }}/api/webhooks/n8n/{{ $env.TENANT_ID }}`
- **Body:**
```json
{
  "eventType": "usage_tracking",
  "data": "={{ $json.usageData }}"
}
```

#### **Opção B: Modificar o Node LangChain para Expor Dados**

Se possível, modificar o node LangChain para incluir dados de uso na saída:

**No node LangChain, adicionar código customizado na saída:**
```javascript
// Adicionar ao final do processamento do LangChain
const usage = $input.item.json.usage || {};
const model = $input.item.json.model || 'gpt-4o-mini';

return {
  ...$input.item.json,
  usageData: {
    operation: 'chat',
    model: model,
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Agent',
      executionId: $execution.id
    }
  }
};
```

---

## 📋 Cenário 3: Capturar na Resposta Final do Workflow

### Usar Webhook de Execução do N8N

Se o N8N tiver webhook de execução, podemos capturar dados no final:

**No último node do workflow, adicionar:**
```javascript
// Node Code: "Capturar Uso Final"
const allData = $input.all();

// Processar todas as respostas para extrair uso
const usageData = [];

for (const item of allData) {
  const data = item.json;
  
  // Verificar se tem usage direto
  if (data.usage) {
    usageData.push({
      operation: data.operation || 'chat',
      model: data.model || 'gpt-4o-mini',
      tokensInput: data.usage.prompt_tokens || 0,
      tokensOutput: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
      metadata: {
        workflowId: $workflow.id,
        executionId: $execution.id
      }
    });
  }
}

// Enviar todos os usos em uma única requisição
return {
  json: {
    allUsageData: usageData
  }
};
```

Depois, node HTTP Request que envia array:
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData }}"
}
```

E no backend, processar o array:
```typescript
// server/webhooks/n8n.ts
case "usage_tracking_batch":
  for (const usageData of payload.data) {
    await handleUsageTracking(tenantId, { data: usageData });
  }
  break;
```

---

## 🔧 Configuração de Variáveis de Ambiente

### No N8N, configurar variáveis:

1. **BACKEND_URL**: URL do seu backend
   - Ex: `https://api.seudominio.com`
   - Ou: `http://localhost:3000` (dev)

2. **TENANT_ID**: ID do tenant (pode ser dinâmico)
   - Pode vir de variável de workflow
   - Ou ser fixo por workflow

### Como configurar:

**Opção 1: Variáveis de Ambiente Globais**
- Settings → Environment Variables
- Adicionar `BACKEND_URL` e `TENANT_ID`

**Opção 2: Variáveis de Workflow**
- No workflow, Settings → Variables
- Adicionar variáveis específicas do workflow

**Opção 3: Hardcoded (não recomendado)**
- Colocar URL diretamente no node
- Ex: `https://api.seudominio.com/api/webhooks/n8n/1`

---

## 📝 Exemplo Completo: Workflow com Múltiplos Nodes

### Estrutura do Workflow:

```
1. Webhook (entrada)
   ↓
2. ROTA Mensagens (router)
   ├─→ [Branch Audio]
   │   ├─ HTTP Request (buscar áudio)
   │   ├─ Extract from File
   │   ├─ OpenAI (Whisper) ← ADICIONAR NODE CODE AQUI
   │   └─ HTTP Request (registrar uso) ← ADICIONAR AQUI
   │
   ├─→ [Branch Image]
   │   ├─ HTTP Request (buscar imagem)
   │   ├─ Extract from File
   │   ├─ OpenAI (Vision) ← ADICIONAR NODE CODE AQUI
   │   └─ HTTP Request (registrar uso) ← ADICIONAR AQUI
   │
   ├─→ [Branch PDF]
   │   ├─ HTTP Request (buscar PDF)
   │   ├─ Extract from File
   │   ├─ Message a model ← ADICIONAR NODE CODE AQUI
   │   └─ HTTP Request (registrar uso) ← ADICIONAR AQUI
   │
   └─→ [Branch Text/Chat]
       ├─ Buscar Configurações
       ├─ LangChain Agent (OpenAI Chat Model) ← PROBLEMA AQUI
       └─ [SOLUÇÃO: Node de agregação no final]
           └─ HTTP Request (registrar uso)
```

---

## 🎯 Recomendação para LangChain Agent

### Solução Mais Prática:

**1. Modificar o node LangChain para incluir dados de uso na saída:**

No node "OpenAI Chat Model" dentro do LangChain, verificar se há opção de "Custom Output" ou "Post-Processing":

```javascript
// Se o LangChain permitir código customizado na saída
const response = $input.item.json;
const usage = response.usage || {};

return {
  ...response,
  _usageData: {
    operation: 'chat',
    model: response.model || 'gpt-4o-mini',
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0
  }
};
```

**2. No final do workflow, antes de retornar resposta:**

Adicionar node "Code" que:
- Coleta todos os `_usageData` do workflow
- Envia para o webhook
- Remove `_usageData` da resposta final

```javascript
// Node: "Processar e Registrar Uso Final"
const finalResponse = $input.item.json;

// Extrair dados de uso se existirem
if (finalResponse._usageData) {
  const usageData = finalResponse._usageData;
  
  // Enviar para webhook (usar HTTP Request depois)
  return {
    json: {
      usageData: usageData,
      response: { ...finalResponse, _usageData: undefined } // Remover dados internos
    }
  };
}

return { json: finalResponse };
```

---

## ⚠️ Importante

1. **Não bloquear o workflow**: Sempre marcar HTTP Request como "Continue On Fail"
2. **Não esperar resposta**: O webhook deve processar assincronamente
3. **Validar dados**: Verificar se `usage` existe antes de processar
4. **Logs**: Adicionar logs no node Code para debug

---

## 🧪 Teste

### Para testar:

1. Executar workflow manualmente
2. Verificar logs do backend
3. Consultar `usageTransactions` no banco
4. Verificar se créditos foram deduzidos

### Query de teste:
```sql
SELECT * FROM "usageTransactions" 
WHERE "tenantId" = 1 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## 📞 Suporte

Se algum node não funcionar, me avise qual node específico e eu crio código customizado para ele!

