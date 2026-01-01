# 📘 GUIA PASSO A PASSO: Adicionar Rastreamento de Créditos no N8N

## 🎯 OBJETIVO

Adicionar nodes no seu workflow N8N para rastrear o consumo de OpenAI e enviar para o backend calcular créditos.

---

## 📍 ONDE ESTAMOS?

Você tem um workflow N8N chamado **"Agente SaaS"** que processa mensagens do WhatsApp.

**O que vamos fazer:**
1. Adicionar nodes "Code" após cada chamada OpenAI
2. Adicionar nodes "HTTP Request" para enviar dados ao backend
3. Configurar variáveis de ambiente

---

## 🔧 PASSO 1: Configurar Variáveis de Ambiente no N8N

### 1.1 Abrir Configurações do N8N

1. No N8N, clique em **"Settings"** (Configurações) no menu lateral
2. Clique em **"Environment Variables"** (Variáveis de Ambiente)

### 1.2 Adicionar Variáveis

Adicione estas variáveis:

| Nome da Variável | Valor | Exemplo |
|-----------------|-------|---------|
| `BACKEND_URL` | URL do seu backend | `https://api.seudominio.com` ou `http://localhost:3000` |
| `TENANT_ID` | ID do tenant (será dinâmico) | Deixe vazio por enquanto |

**OU** configure no workflow específico:
1. Abra o workflow "Agente SaaS"
2. Clique em **"Settings"** (ícone de engrenagem)
3. Vá em **"Variables"**
4. Adicione as mesmas variáveis

---

## 📍 PASSO 2: Encontrar os Nodes OpenAI no Seu Workflow

Abra o workflow **"Agente SaaS"** e procure por estes nodes:

### Nodes que você provavelmente tem:

1. **"OpenAI Chat Model"** - Node principal de chat (LangChain)
2. **"OpenAI4"** - Node de transcrição de áudio (Whisper)
3. **"Analyze image"** - Node de análise de imagem (Vision)
4. **"Message a model"** - Node que processa PDF

**Anote os nomes EXATOS** dos seus nodes (podem ser diferentes).

---

## 🔨 PASSO 3: Adicionar Node "Code" Após Cada Node OpenAI

### 3.1 Para o Node "OpenAI Chat Model" (LangChain Agent)

**⚠️ PROBLEMA:** Este node não permite adicionar node depois diretamente.

**✅ SOLUÇÃO:** Vamos capturar na saída final do workflow.

**Onde adicionar:**
- No **FINAL do workflow**, antes de enviar a resposta final
- Procure pelo último node que processa a resposta (geralmente um "HTTP Request" que envia para Chatwoot ou Evolution)

**Como fazer:**

1. **Clique com botão direito** no último node antes da resposta final
2. Selecione **"Add node after"** (Adicionar node depois)
3. Procure por **"Code"** e adicione
4. **Nome do node:** `Capturar Uso - LangChain Agent`

5. **Cole este código:**

```javascript
// Capturar dados de uso do LangChain Agent
const inputData = $input.item.json;

// Tentar extrair dados de uso
let usageData = null;

// Formato 1: Dados diretos no JSON
if (inputData.usage) {
  const usage = inputData.usage;
  const model = inputData.model || 'gpt-4o-mini';
  
  usageData = {
    operation: 'chat',
    model: model,
    tokensInput: usage.prompt_tokens || usage.input_tokens || 0,
    tokensOutput: usage.completion_tokens || usage.output_tokens || 0,
    totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Agent',
      executionId: $execution.id
    }
  };
}

// Se encontrou dados de uso, retornar para envio ao webhook
if (usageData) {
  return {
    json: {
      usageData: usageData,
      // Manter resposta original
      originalResponse: inputData
    }
  };
}

// Se não encontrou, retornar dados originais
return { json: inputData };
```

6. **Clique em "Save"** (Salvar)

---

### 3.2 Para o Node "OpenAI4" (Transcrição de Áudio)

**Onde adicionar:**
- **DEPOIS** do node "OpenAI4"
- Procure pelo node que vem logo após a transcrição

**Como fazer:**

1. **Clique com botão direito** no node "OpenAI4"
2. Selecione **"Add node after"**
3. Adicione node **"Code"**
4. **Nome do node:** `Capturar Uso - Áudio`

5. **Cole este código:**

```javascript
// Capturar dados de uso do node de transcrição de áudio
const inputData = $input.item.json;

// Para Whisper, pode não ter tokens, mas sim duração
const audioDuration = inputData.audioDurationSeconds || inputData.duration || inputData.audio_duration || 0;

return {
  json: {
    ...inputData,
    usageData: {
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
    }
  }
};
```

6. **Clique em "Save"**

---

### 3.3 Para o Node "Analyze image" (Análise de Imagem)

**Onde adicionar:**
- **DEPOIS** do node "Analyze image"

**Como fazer:**

1. **Clique com botão direito** no node "Analyze image"
2. Selecione **"Add node after"**
3. Adicione node **"Code"**
4. **Nome do node:** `Capturar Uso - Imagem`

5. **Cole este código:**

```javascript
// Capturar dados de uso do node de análise de imagem
const inputData = $input.item.json;
const usage = inputData.usage || {};
const model = inputData.model || 'gpt-4o-vision';

return {
  json: {
    ...inputData,
    usageData: {
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
    }
  }
};
```

6. **Clique em "Save"**

---

### 3.4 Para o Node "Message a model" (Processamento de PDF)

**Onde adicionar:**
- **DEPOIS** do node "Message a model"

**Como fazer:**

1. **Clique com botão direito** no node "Message a model"
2. Selecione **"Add node after"**
3. Adicione node **"Code"**
4. **Nome do node:** `Capturar Uso - PDF`

5. **Cole este código:**

```javascript
// Capturar dados de uso do node que processa PDF
const inputData = $input.item.json;
const usage = inputData.usage || {};
const model = inputData.model || 'gpt-4o-mini';

return {
  json: {
    ...inputData,
    usageData: {
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
    }
  }
};
```

6. **Clique em "Save"**

---

## 🌐 PASSO 4: Adicionar Node "HTTP Request" para Enviar ao Backend

**Para CADA node "Code" que você criou**, adicione um node "HTTP Request" depois:

### 4.1 Como Adicionar

1. **Clique com botão direito** no node "Code" que você acabou de criar
2. Selecione **"Add node after"**
3. Procure por **"HTTP Request"** e adicione
4. **Nome do node:** `Registrar Uso - [Nome do Node]`
   - Exemplo: `Registrar Uso - LangChain Agent`

### 4.2 Configurar o HTTP Request

**Aba "Parameters":**

1. **Method:** Selecione **"POST"**

2. **URL:** Cole uma destas opções:

   **Opção A (usando variáveis):**
   ```
   {{ $env.BACKEND_URL }}/api/webhooks/n8n/{{ $vars.TENANT_ID }}
   ```

   **Opção B (hardcoded - substitua pelos seus valores):**
   ```
   https://api.seudominio.com/api/webhooks/n8n/1
   ```
   *(Substitua `seudominio.com` pela sua URL e `1` pelo ID do tenant)*

3. **Authentication:** Deixe **"None"**

**Aba "Body":**

1. **Body Content Type:** Selecione **"JSON"**

2. **Body:** Cole este JSON:

```json
{
  "eventType": "usage_tracking",
  "data": "={{ $json.usageData }}",
  "timestamp": "={{ $now.toISO() }}"
}
```

**Aba "Options":**

1. **Continue On Fail:** Marque como **✅ TRUE** (IMPORTANTE!)
   - Isso garante que o workflow não pare se o webhook falhar

2. **Response:** Deixe **"Last Response"**

### 4.3 Conectar o Node

**IMPORTANTE:** O node HTTP Request deve estar **em paralelo** ao fluxo principal, não bloqueando a resposta.

**Como fazer:**

1. O node HTTP Request deve estar conectado **DEPOIS** do node Code
2. Mas a **resposta final do workflow** deve continuar normalmente
3. Se necessário, use um node **"Merge"** ou **"Split"** para manter o fluxo

**Exemplo de estrutura:**

```
[Node OpenAI]
    ↓
[Node Code: Capturar Uso]
    ├─→ [HTTP Request: Registrar Uso] (não bloqueia)
    └─→ [Continuar fluxo normal] → [Resposta Final]
```

---

## 🧪 PASSO 5: Testar

### 5.1 Executar Workflow Manualmente

1. No N8N, clique em **"Execute Workflow"** (botão play)
2. Envie uma mensagem de teste
3. Verifique se os nodes "HTTP Request" foram executados

### 5.2 Verificar Logs do Backend

No seu backend, verifique os logs:

```bash
# Deve aparecer algo como:
[N8N Webhook] ✅ Uso registrado para tenant 1: { operation: 'chat', ... }
```

### 5.3 Verificar Banco de Dados

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

### Problema 1: "Cannot find module"

**Erro:** Node Code não encontra variáveis

**Solução:** 
- Verifique se as variáveis de ambiente estão configuradas
- Use `$vars.TENANT_ID` ao invés de `$env.TENANT_ID` se estiver no workflow

### Problema 2: HTTP Request falha

**Erro:** 404 ou erro de conexão

**Solução:**
- Verifique se a URL está correta
- Verifique se o backend está rodando
- Verifique se o tenantId está correto na URL

### Problema 3: Workflow para de funcionar

**Erro:** Workflow não envia mais respostas

**Solução:**
- Certifique-se que marcou "Continue On Fail" no HTTP Request
- Verifique se o fluxo principal não foi quebrado
- Use nodes "Merge" ou "Split" se necessário

### Problema 4: Não captura dados do LangChain

**Erro:** `usageData` está vazio

**Solução:**
- Verifique se o LangChain retorna dados de `usage` na saída
- Pode ser necessário modificar o node LangChain para expor esses dados
- Tente adicionar logs no node Code para ver o que está vindo:

```javascript
console.log('Input data:', JSON.stringify($input.item.json, null, 2));
return { json: $input.item.json };
```

---

## 📋 CHECKLIST FINAL

Antes de publicar o workflow, verifique:

- [ ] Variáveis de ambiente configuradas (`BACKEND_URL`, `TENANT_ID`)
- [ ] Node "Code" adicionado após cada node OpenAI
- [ ] Node "HTTP Request" adicionado após cada node "Code"
- [ ] HTTP Request configurado com URL correta
- [ ] HTTP Request marcado como "Continue On Fail"
- [ ] Workflow testado manualmente
- [ ] Transações aparecendo no banco de dados
- [ ] Logs do backend mostrando registros de uso

---

## 🆘 PRECISA DE AJUDA?

Se algo não funcionar:

1. **Me envie:**
   - Nome exato dos seus nodes OpenAI
   - Erro que aparece nos logs
   - Screenshot do workflow (se possível)

2. **Vou criar código customizado** para o seu caso específico!

---

## 📝 RESUMO RÁPIDO

1. **Configurar variáveis** → `BACKEND_URL` e `TENANT_ID`
2. **Adicionar node Code** → Após cada node OpenAI
3. **Adicionar HTTP Request** → Após cada node Code
4. **Configurar HTTP Request** → URL do webhook + Continue On Fail
5. **Testar** → Executar workflow e verificar logs

**Pronto!** 🎉

