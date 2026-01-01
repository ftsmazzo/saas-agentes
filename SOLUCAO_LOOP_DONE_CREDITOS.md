# ✅ SOLUÇÃO: Adicionar no "Done" do Loop

## 🎯 SITUAÇÃO

- Seu último node é **"Loop Over Items3"** (splitInBatches)
- Este node tem uma saída **"done"** quando termina o loop
- Você quer adicionar o código de créditos no **"done"** desse loop

## ✅ WEBHOOK JÁ EXISTE

**O webhook JÁ ESTÁ CRIADO no seu código:**

- **Arquivo:** `server/_core/index.ts` (linha 39)
- **Rota:** `POST /api/webhooks/n8n/:tenantId`
- **Handler:** `server/webhooks/n8n.ts`

**Você NÃO precisa criar nada!** Só precisa chamar essa URL.

---

## 📍 PASSO 1: Conectar no "Done" do Loop

### 1.1 No N8N, abra o workflow "Agente SaaS"

### 1.2 Encontre o node "Loop Over Items3"

### 1.3 Clique no node "Loop Over Items3"

Você verá que ele tem **2 saídas**:
- **"Loop"** - Para cada item do loop
- **"Done"** - Quando o loop termina

### 1.4 Conecte um node "Code" na saída "Done"

1. **Clique e arraste** da saída **"Done"** do "Loop Over Items3"
2. Solte e procure por **"Code"**
3. Adicione o node Code
4. **Nome do node:** `Capturar Uso - Final`

---

## 🔧 PASSO 2: Colar o Código

### 2.1 Abra o node "Code" que você acabou de criar

### 2.2 Cole este código COMPLETO:

```javascript
// ============================================
// CAPTURAR TODOS OS USOS DE UMA VEZ
// Executa quando o loop termina (done)
// ============================================

// 1. Pegar tenantId do fluxo (já existe no seu workflow)
const tenantId = $json.tenantId || 
                 $('Edit Fields2').item.json.tenantId || 
                 (() => {
                   // Tentar extrair do webhook URL se não estiver disponível
                   const webhookUrl = $('Webhook').item.json.webhookUrl || '';
                   const match = webhookUrl.match(/tenant[_\s]*(\d+)/i);
                   return match ? parseInt(match[1]) : null;
                 })();

if (!tenantId) {
  console.log('⚠️ TenantId não encontrado, pulando registro de uso');
  return { json: {} }; // Retorna vazio se não tiver tenantId
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
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString()
    }
  };
}

// 9. Se não encontrou nenhum uso, retornar vazio
return { json: { tenantId: tenantId, allUsageData: [] } };
```

### 2.3 Clique em "Save" (Salvar)

---

## 🌐 PASSO 3: Adicionar HTTP Request

### 3.1 Conecte um node "HTTP Request" depois do Code

1. **Clique e arraste** da saída do node "Capturar Uso - Final"
2. Solte e procure por **"HTTP Request"**
3. Adicione o node HTTP Request
4. **Nome do node:** `Registrar Uso - Backend`

### 3.2 Configurar o HTTP Request

**Aba "Parameters":**

1. **Method:** Selecione **"POST"**

2. **URL:** 

   **SUBSTITUA PELA URL DO SEU BACKEND:**
   
   ```
   http://localhost:3000/api/webhooks/n8n/{{ $json.tenantId }}
   ```
   
   **OU se o backend estiver em outro servidor:**
   
   ```
   http://IP_DO_SERVIDOR:3000/api/webhooks/n8n/{{ $json.tenantId }}
   ```
   
   **OU se tiver domínio:**
   
   ```
   https://api.seudominio.com/api/webhooks/n8n/{{ $json.tenantId }}
   ```

3. **Authentication:** Deixe **"None"**

**Aba "Body":**

1. **Body Content Type:** Selecione **"JSON"**

2. **Body:** Cole este JSON:

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData }}",
  "timestamp": "={{ $json.timestamp }}"
}
```

**Aba "Options":**

1. **Continue On Fail:** Marque como **✅ TRUE** (MUITO IMPORTANTE!)
   - Isso garante que o workflow não pare se o webhook falhar

2. **Response:** Deixe **"Last Response"**

### 3.3 Clique em "Save" (Salvar)

---

## 📊 ESTRUTURA FINAL

```
[Loop Over Items3]
    ├─→ [Loop] → (fluxo normal continua)
    └─→ [Done] → [Code: Capturar Uso - Final] → [HTTP Request: Registrar Uso]
```

---

## 🧪 PASSO 4: Testar

### 4.1 Executar Workflow

1. No N8N, clique em **"Execute Workflow"** (botão play)
2. Envie uma mensagem de teste
3. Aguarde o loop terminar
4. Verifique se o node "HTTP Request" foi executado

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

## ⚠️ IMPORTANTE: URL do Backend

**Você precisa descobrir a URL do seu backend:**

### Opção 1: Se estiver no mesmo servidor do N8N
```
http://localhost:3000/api/webhooks/n8n/{{ $json.tenantId }}
```

### Opção 2: Se estiver em outro servidor
```
http://IP_DO_SERVIDOR:3000/api/webhooks/n8n/{{ $json.tenantId }}
```

### Opção 3: Se tiver domínio configurado
```
https://api.seudominio.com/api/webhooks/n8n/{{ $json.tenantId }}
```

**Para descobrir:**
- Veja onde seu backend está rodando (EasyPanel, Docker, etc.)
- Veja a porta configurada (geralmente 3000)
- Use a URL completa

---

## 🔍 AJUSTAR NOMES DOS NODES (Se Necessário)

O código procura por estes nomes exatos:
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

## ✅ CHECKLIST

- [ ] Node "Code" conectado na saída **"Done"** do "Loop Over Items3"
- [ ] Código colado e salvo
- [ ] Node "HTTP Request" adicionado após o Code
- [ ] URL do backend configurada corretamente
- [ ] HTTP Request marcado como "Continue On Fail"
- [ ] Workflow testado
- [ ] Transações aparecendo no banco

---

## 🆘 PROBLEMAS?

### Problema: "Cannot read property 'item' of undefined"

**Solução:** O nome do node está errado. Verifique o nome exato no workflow e ajuste no código.

### Problema: HTTP Request retorna 404

**Solução:** 
- Verifique se a URL do backend está correta
- Verifique se o backend está rodando
- Teste a URL manualmente no navegador: `http://localhost:3000/api/health`

### Problema: TenantId é null

**Solução:** Ajuste esta linha no código para pegar de onde o tenantId realmente está:

```javascript
const tenantId = $json.tenantId || 
                 $('Edit Fields2').item.json.tenantId || 
                 $('Set').item.json.tenantId || // Adicione mais opções
                 // ...
```

---

## 📝 RESUMO

1. **Conectar node Code** → Na saída **"Done"** do "Loop Over Items3"
2. **Colar código** → Copiar e colar o código acima
3. **Adicionar HTTP Request** → Depois do Code
4. **Configurar URL** → URL do seu backend + `/api/webhooks/n8n/{{ $json.tenantId }}`
5. **Marcar Continue On Fail** → Para não quebrar o workflow
6. **Testar** → Executar workflow e verificar logs

**Pronto!** 🎉

