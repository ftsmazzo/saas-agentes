# ✅ SOLUÇÃO FINAL: Rastreamento de Créditos SEM Quebrar o Fluxo

## 🎯 OBJETIVO

Adicionar **UM ÚNICO NODE** no final do workflow que captura TODOS os dados de uso de uma vez, sem quebrar variáveis existentes.

---

## ✅ VANTAGENS DESTA SOLUÇÃO

- ✅ **Não quebra o fluxo** - Adiciona apenas no final
- ✅ **Não precisa de variáveis de ambiente** - Usa dados do próprio workflow
- ✅ **Não precisa de API externa** - Usa o webhook que já existe
- ✅ **Captura tudo de uma vez** - Um único node processa todos os usos
- ✅ **Usa tenantId existente** - Pega do fluxo que já está funcionando

---

## 📍 ONDE ADICIONAR

**No FINAL do workflow**, antes de enviar a resposta final.

Procure pelo último node que:
- Envia resposta para Chatwoot/Evolution
- Ou é o último node antes do fim do workflow

**Adicione o node DEPOIS dele**, em paralelo (não bloqueia a resposta).

---

## 🔧 PASSO 1: Adicionar Node "Code" no Final

### 1.1 Localizar o Final do Workflow

No seu workflow "Agente SaaS", encontre o último node que processa a resposta (geralmente um "HTTP Request" que envia para Chatwoot ou Evolution).

### 1.2 Adicionar Node Code

1. **Clique com botão direito** no último node
2. Selecione **"Add node after"**
3. Procure por **"Code"** e adicione
4. **Nome do node:** `Capturar e Registrar Uso - Final`

### 1.3 Cole Este Código Completo

```javascript
// ============================================
// CAPTURAR TODOS OS USOS DE UMA VEZ
// ============================================

// 1. Pegar tenantId do fluxo (já existe no seu workflow)
const tenantId = $json.tenantId || 
                 $('Webhook').item.json.tenantId || 
                 (() => {
                   // Tentar extrair do webhook URL se não estiver disponível
                   const webhookUrl = $('Webhook').item.json.webhookUrl || '';
                   const match = webhookUrl.match(/tenant[_\s]*(\d+)/i);
                   return match ? parseInt(match[1]) : null;
                 })();

if (!tenantId) {
  console.log('⚠️ TenantId não encontrado, pulando registro de uso');
  return { json: $json }; // Retorna dados originais sem quebrar
}

// 2. Array para armazenar todos os usos encontrados
const allUsageData = [];

// 3. Capturar uso do LangChain Agent (OpenAI Chat Model)
try {
  const chatModel = $('OpenAI Chat Model');
  if (chatModel && chatModel.item && chatModel.item.json) {
    const data = chatModel.item.json;
    if (data.usage || data.response?.usage) {
      const usage = data.usage || data.response.usage;
      const model = data.model || data.response?.model || 'gpt-4o-mini';
      
      allUsageData.push({
        operation: 'chat',
        model: model,
        tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
        tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'OpenAI Chat Model',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  console.log('Node OpenAI Chat Model não encontrado ou sem dados de uso');
}

// 4. Capturar uso do OpenAI Split
try {
  const splitModel = $('OpenAI Split');
  if (splitModel && splitModel.item && splitModel.item.json) {
    const data = splitModel.item.json;
    if (data.usage || data.response?.usage) {
      const usage = data.usage || data.response.usage;
      const model = data.model || data.response?.model || 'gpt-4o-mini';
      
      allUsageData.push({
        operation: 'chat',
        model: model,
        tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
        tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'OpenAI Split',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  console.log('Node OpenAI Split não encontrado ou sem dados de uso');
}

// 5. Capturar uso do OpenAI4 (Transcrição de Áudio)
try {
  const audioModel = $('OpenAI4');
  if (audioModel && audioModel.item && audioModel.item.json) {
    const data = audioModel.item.json;
    const audioDuration = data.audioDurationSeconds || data.duration || data.audio_duration || 0;
    
    // Para Whisper, pode não ter tokens, mas sim duração
    if (audioDuration > 0 || data.usage) {
      allUsageData.push({
        operation: 'audio',
        model: 'whisper-1',
        audioDurationSeconds: audioDuration,
        tokensInput: 0,
        tokensOutput: 0,
        totalTokens: 0,
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'OpenAI4',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  console.log('Node OpenAI4 não encontrado ou sem dados de uso');
}

// 6. Capturar uso do Analyze image (Análise de Imagem)
try {
  const imageModel = $('Analyze image');
  if (imageModel && imageModel.item && imageModel.item.json) {
    const data = imageModel.item.json;
    if (data.usage || data.response?.usage) {
      const usage = data.usage || data.response.usage;
      const model = data.model || data.response?.model || 'gpt-4o-vision';
      
      allUsageData.push({
        operation: 'image',
        model: model,
        tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
        tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'Analyze image',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  console.log('Node Analyze image não encontrado ou sem dados de uso');
}

// 7. Capturar uso do Message a model (PDF)
try {
  const pdfModel = $('Message a model');
  if (pdfModel && pdfModel.item && pdfModel.item.json) {
    const data = pdfModel.item.json;
    if (data.usage || data.response?.usage) {
      const usage = data.usage || data.response.usage;
      const model = data.model || data.response?.model || 'gpt-4o-mini';
      
      allUsageData.push({
        operation: 'pdf',
        model: model,
        tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
        tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'Message a model',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  console.log('Node Message a model não encontrado ou sem dados de uso');
}

// 8. Se encontrou algum uso, preparar para envio
if (allUsageData.length > 0) {
  return {
    json: {
      ...$json, // Manter dados originais
      _usageTracking: {
        tenantId: tenantId,
        allUsageData: allUsageData,
        timestamp: new Date().toISOString()
      }
    }
  };
}

// 9. Se não encontrou nenhum uso, retornar dados originais
return { json: $json };
```

### 1.4 Salvar o Node

Clique em **"Save"** (Salvar)

---

## 🌐 PASSO 2: Adicionar Node "HTTP Request" para Enviar

### 2.1 Adicionar HTTP Request

1. **Clique com botão direito** no node "Capturar e Registrar Uso - Final"
2. Selecione **"Add node after"**
3. Procure por **"HTTP Request"** e adicione
4. **Nome do node:** `Registrar Uso - Backend`

### 2.2 Configurar HTTP Request

**Aba "Parameters":**

1. **Method:** Selecione **"POST"**

2. **URL:** 

   **SUBSTITUA PELA SUA URL DO BACKEND:**
   
   ```
   http://seu-backend:3000/api/webhooks/n8n/{{ $json._usageTracking.tenantId }}
   ```
   
   **OU se estiver no mesmo servidor:**
   
   ```
   http://localhost:3000/api/webhooks/n8n/{{ $json._usageTracking.tenantId }}
   ```
   
   **OU se tiver domínio:**
   
   ```
   https://api.seudominio.com/api/webhooks/n8n/{{ $json._usageTracking.tenantId }}
   ```

3. **Authentication:** Deixe **"None"**

**Aba "Body":**

1. **Body Content Type:** Selecione **"JSON"**

2. **Body:** Cole este JSON:

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._usageTracking.allUsageData }}",
  "timestamp": "={{ $json._usageTracking.timestamp }}"
}
```

**Aba "Options":**

1. **Continue On Fail:** Marque como **✅ TRUE** (MUITO IMPORTANTE!)
   - Isso garante que o workflow não pare se o webhook falhar

2. **Response:** Deixe **"Last Response"**

### 2.3 Conectar o Node

**IMPORTANTE:** Este node deve estar **em paralelo**, não bloqueando a resposta final.

**Como fazer:**

1. O node HTTP Request deve estar conectado **DEPOIS** do node Code
2. Mas a **resposta final do workflow** deve continuar normalmente
3. Se necessário, use um node **"Merge"** ou deixe o HTTP Request como ramo paralelo

**Estrutura ideal:**

```
[Último Node do Fluxo Principal]
    ↓
[Node Code: Capturar e Registrar Uso - Final]
    ├─→ [HTTP Request: Registrar Uso] (não bloqueia)
    └─→ [Resposta Final] (continua normalmente)
```

**OU se o último node já envia resposta:**

```
[Último Node que Envia Resposta]
    ↓
[Node Code: Capturar e Registrar Uso - Final]
    └─→ [HTTP Request: Registrar Uso] (não bloqueia, resposta já foi enviada)
```

---

## 🔍 PASSO 3: Ajustar Nomes dos Nodes (Se Necessário)

O código acima procura por estes nomes exatos:
- `OpenAI Chat Model`
- `OpenAI Split`
- `OpenAI4`
- `Analyze image`
- `Message a model`

**Se algum node tiver nome diferente**, ajuste no código:

**Exemplo:** Se o node se chama "OpenAI Chat" ao invés de "OpenAI Chat Model":

```javascript
// Trocar esta linha:
const chatModel = $('OpenAI Chat Model');

// Por esta:
const chatModel = $('OpenAI Chat');
```

---

## 🧪 PASSO 4: Testar

### 4.1 Executar Workflow

1. No N8N, clique em **"Execute Workflow"** (botão play)
2. Envie uma mensagem de teste
3. Verifique se o node "HTTP Request" foi executado

### 4.2 Verificar Logs do Backend

No seu backend, verifique os logs:

```bash
# Deve aparecer algo como:
[N8N Webhook] ✅ Uso registrado para tenant 1: { operation: 'chat', ... }
```

### 4.3 Verificar Banco de Dados

Execute esta query no PostgreSQL:

```sql
SELECT * FROM "usageTransactions" 
WHERE "tenantId" = 1 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

Deve aparecer as transações registradas.

---

## ⚠️ PROBLEMAS COMUNS

### Problema 1: "Cannot read property 'item' of undefined"

**Erro:** Node não encontrado

**Solução:** 
- Verifique se o nome do node está correto
- O nome deve ser EXATAMENTE igual ao que aparece no workflow
- Use `$('Nome Exato do Node')` com aspas simples

### Problema 2: HTTP Request retorna 404

**Erro:** URL incorreta

**Solução:**
- Verifique se a URL do backend está correta
- Verifique se o backend está rodando
- Verifique se a rota `/api/webhooks/n8n/:tenantId` existe

### Problema 3: TenantId é null

**Erro:** Não consegue pegar tenantId

**Solução:**
- Verifique se o node "Set" que extrai tenantId está funcionando
- Ajuste o código para pegar de onde o tenantId realmente está:

```javascript
// Tente estas opções:
const tenantId = $json.tenantId || 
                 $('Set').item.json.tenantId || 
                 $('Webhook').item.json.tenantId ||
                 // Adicione mais opções conforme seu fluxo
```

### Problema 4: Não captura dados de uso

**Erro:** `allUsageData` está vazio

**Solução:**
- Adicione logs para debug:

```javascript
console.log('TenantId:', tenantId);
console.log('Chat Model data:', $('OpenAI Chat Model').item?.json);
console.log('Usage encontrado:', allUsageData.length);
```

- Verifique se os nodes OpenAI realmente retornam `usage` na saída
- Pode ser necessário ajustar o caminho dos dados conforme a estrutura do seu workflow

---

## 📋 CHECKLIST FINAL

Antes de publicar o workflow, verifique:

- [ ] Node "Code" adicionado no final do workflow
- [ ] Código ajustado com nomes corretos dos nodes
- [ ] Node "HTTP Request" adicionado após o Code
- [ ] URL do backend configurada corretamente
- [ ] HTTP Request marcado como "Continue On Fail"
- [ ] Workflow testado manualmente
- [ ] Transações aparecendo no banco de dados
- [ ] Logs do backend mostrando registros de uso

---

## 🎯 RESUMO

1. **Adicionar UM node Code** → No final do workflow
2. **Código captura tudo** → De todos os nodes OpenAI de uma vez
3. **Adicionar UM HTTP Request** → Envia tudo em batch
4. **Não quebra nada** → Fluxo continua normalmente
5. **Usa dados existentes** → tenantId já está no fluxo

**Pronto!** 🎉

---

## 🆘 PRECISA DE AJUDA?

Se algo não funcionar:

1. **Me envie:**
   - Nome exato dos seus nodes OpenAI
   - Erro que aparece nos logs do node Code
   - Estrutura dos dados que vêm dos nodes (adicione `console.log` no código)

2. **Vou ajustar o código** para o seu caso específico!

