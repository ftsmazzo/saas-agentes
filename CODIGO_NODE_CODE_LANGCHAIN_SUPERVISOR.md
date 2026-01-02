# ✅ Código Node Code - Após LangChain Supervisor

## 🎯 OBJETIVO

Capturar todos os tokens de uso OpenAI de todos os nodes do workflow, incluindo o LangChain Supervisor, sem causar loop infinito.

---

## 🔧 CÓDIGO COMPLETO (VERSÃO SEGURA)

**Cole este código no node "Code" que está DEPOIS do "LangChain Supervisor":**

```javascript
// ============================================
// CAPTURAR TODOS OS TOKENS - VERSÃO SEGURA
// ============================================
// Este código captura tokens de todos os nodes OpenAI do workflow
// Sem causar loops ou travamentos

// 1. Pegar tenantId de forma segura
let tenantId = null;

try {
  // Tentar várias fontes para encontrar tenantId
  tenantId = $json.tenantId || 
             $('Edit Fields2')?.item?.json?.tenantId || 
             $('Set')?.item?.json?.tenantId ||
             $('Webhook')?.item?.json?.tenantId;
  
  // Se ainda não encontrou, tentar extrair do webhook URL
  if (!tenantId) {
    try {
      const webhook = $('Webhook');
      if (webhook && webhook.item && webhook.item.json) {
        const webhookUrl = webhook.item.json.webhookUrl || webhook.item.json.url || '';
        const match = webhookUrl.match(/tenant[_\s]*(\d+)/i) || webhookUrl.match(/\/(\d+)\//);
        if (match && match[1]) {
          tenantId = parseInt(match[1]);
        }
      }
    } catch (e) {
      // Ignorar erro
    }
  }
} catch (e) {
  console.log('Erro ao buscar tenantId:', e.message);
}

if (!tenantId) {
  console.log('⚠️ TenantId não encontrado, pulando registro');
  // Retornar estrutura vazia mas válida para não travar
  return { 
    json: { 
      tenantId: null,
      allUsageData: [],
      timestamp: new Date().toISOString()
    } 
  };
}

// 2. Array para armazenar todos os usos encontrados
const allUsageData = [];

// 3. Função auxiliar SEGURA para capturar uso de um node
function captureUsage(nodeName, operation, defaultModel) {
  try {
    // Verificar se o node existe antes de acessar
    const node = $(nodeName);
    if (!node) {
      return; // Node não existe, pular
    }
    
    // Verificar se tem item e json
    if (!node.item || !node.item.json) {
      return; // Node não tem dados, pular
    }
    
    const data = node.item.json;
    
    // Tentar encontrar dados de uso em diferentes formatos
    const usage = data.usage || 
                  data.response?.usage || 
                  data.output?.usage ||
                  data._usage ||
                  data.usageData?.usage;
    
    // Se não tem dados de uso, pular
    if (!usage) {
      return;
    }
    
    // Extrair modelo
    const model = data.model || 
                  data.response?.model || 
                  data.output?.model || 
                  data._model ||
                  defaultModel;
    
    // Para áudio (Whisper), tratar diferente
    if (operation === 'audio') {
      const audioDuration = data.audioDurationSeconds || 
                           data.duration || 
                           data.audio_duration || 
                           data.response?.audioDurationSeconds ||
                           0;
      
      if (audioDuration > 0) {
        allUsageData.push({
          operation: 'audio',
          model: 'whisper-1',
          audioDurationSeconds: audioDuration,
          tokensInput: 0,
          tokensOutput: 0,
          totalTokens: 0,
          metadata: {
            workflowId: $workflow.id,
            nodeName: nodeName,
            executionId: $execution.id
          }
        });
      }
    } else {
      // Para outros tipos (chat, image, pdf, format)
      const tokensInput = usage.prompt_tokens || 
                         usage.input_tokens || 
                         usage.promptTokens ||
                         0;
      
      const tokensOutput = usage.completion_tokens || 
                          usage.output_tokens || 
                          usage.completionTokens ||
                          0;
      
      const totalTokens = usage.total_tokens || 
                         usage.totalTokens ||
                         (tokensInput + tokensOutput);
      
      // Só adicionar se tiver pelo menos alguns tokens
      if (totalTokens > 0 || tokensInput > 0 || tokensOutput > 0) {
        allUsageData.push({
          operation: operation,
          model: model || defaultModel,
          tokensInput: tokensInput,
          tokensOutput: tokensOutput,
          totalTokens: totalTokens,
          metadata: {
            workflowId: $workflow.id,
            nodeName: nodeName,
            executionId: $execution.id
          }
        });
      }
    }
  } catch (e) {
    // Ignorar erros silenciosamente - node pode não existir ou estar em estado diferente
    // Não logar para não poluir logs
  }
}

// 4. Capturar uso do LangChain Supervisor (PRINCIPAL)
// O Supervisor geralmente retorna dados na saída direta
try {
  const supervisorData = $input.item.json;
  
  // Tentar encontrar usage no formato do LangChain
  const supervisorUsage = supervisorData.usage || 
                          supervisorData.response?.usage ||
                          supervisorData.output?.usage ||
                          supervisorData._usage;
  
  if (supervisorUsage) {
    const model = supervisorData.model || 
                  supervisorData.response?.model || 
                  supervisorData.output?.model ||
                  'gpt-4o-mini';
    
    const tokensInput = supervisorUsage.prompt_tokens || 
                       supervisorUsage.input_tokens || 
                       0;
    
    const tokensOutput = supervisorUsage.completion_tokens || 
                        supervisorUsage.output_tokens || 
                        0;
    
    const totalTokens = supervisorUsage.total_tokens || 
                       (tokensInput + tokensOutput);
    
    if (totalTokens > 0) {
      allUsageData.push({
        operation: 'chat',
        model: model,
        tokensInput: tokensInput,
        tokensOutput: tokensOutput,
        totalTokens: totalTokens,
        metadata: {
          workflowId: $workflow.id,
          nodeName: 'LangChain Supervisor',
          executionId: $execution.id
        }
      });
    }
  }
} catch (e) {
  // Ignorar erro - pode não ter dados de uso no Supervisor
}

// 5. Capturar usos de outros nodes OpenAI (com try/catch individual)
// Ajuste os nomes dos nodes conforme seu workflow

// Nodes de Chat
captureUsage('OpenAI Chat Model', 'chat', 'gpt-4o-mini');
captureUsage('OpenAI Split', 'chat', 'gpt-4o-mini');
captureUsage('Chat Model', 'chat', 'gpt-4o-mini');

// Node de Áudio (Whisper)
captureUsage('OpenAI4', 'audio', 'whisper-1');
captureUsage('Transcribe Recording', 'audio', 'whisper-1');
captureUsage('Whisper', 'audio', 'whisper-1');

// Node de Imagem (Vision)
captureUsage('Analyze image', 'image', 'gpt-4o-vision');
captureUsage('Vision', 'image', 'gpt-4o-vision');

// Node de PDF
captureUsage('Message a model', 'pdf', 'gpt-4o-mini');
captureUsage('PDF', 'pdf', 'gpt-4o-mini');

// Node de Formatação
captureUsage('Format', 'format', 'gpt-4o-mini');
captureUsage('Formatar', 'format', 'gpt-4o-mini');

// 6. Retornar resultado (SEMPRE retorna algo para não travar)
return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString(),
    totalItems: allUsageData.length
  }
};
```

---

## 🔧 CONFIGURAÇÃO DO HTTP REQUEST

**Depois do node Code, adicione um node "HTTP Request":**

### URL:
```
http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json.tenantId }}
```

**OU se tiver domínio:**
```
https://DOMINIO_BACKEND/api/webhooks/n8n/{{ $json.tenantId }}
```

### Method:
```
POST
```

### Body Content Type:
```
JSON
```

### Body (JSON):
```json
{
  "eventType": "usage_tracking_batch",
  "data": {{ $json.allUsageData }},
  "timestamp": "{{ $json.timestamp }}"
}
```

### Options:
- ✅ **Continue On Fail:** `TRUE` (importante!)
- ✅ **Response:** `Last Node Output` (ou `JSON`)

---

## 🎯 O QUE ESTE CÓDIGO FAZ

1. **Busca tenantId** de várias fontes de forma segura
2. **Captura uso do LangChain Supervisor** (principal fonte)
3. **Captura uso de outros nodes OpenAI** (se existirem)
4. **Trata erros** - nunca trava, sempre retorna algo
5. **Ignora nodes que não existem** - não causa erro
6. **Agrega todos os usos** em um array
7. **Retorna estrutura válida** sempre

---

## ⚠️ IMPORTANTE

### Por que não trava:

1. **Try/catch em tudo** - nenhum erro quebra o código
2. **Verificação de existência** - só acessa nodes que existem
3. **Retorno garantido** - sempre retorna algo válido
4. **Não acessa propriedades indefinidas** - usa optional chaining (`?.`)
5. **Ignora erros silenciosamente** - não tenta processar nodes que falharam

### Ajustes necessários:

1. **Ajuste os nomes dos nodes** conforme seu workflow:
   - Se seu node se chama "OpenAI Chat" ao invés de "OpenAI Chat Model", ajuste
   - Se seu node de áudio tem outro nome, ajuste
   - Adicione mais nodes se necessário

2. **Teste primeiro** com o código básico:
   - Se ainda travar, use a versão ultra-simplificada abaixo

---

## 🧪 VERSÃO ULTRA-SIMPLIFICADA (SE AINDA TRAVAR)

Se ainda travar, use esta versão que só captura do Supervisor:

```javascript
// VERSÃO ULTRA-SIMPLES - SÓ SUPERVISOR
const tenantId = $json.tenantId || 
                 $('Edit Fields2')?.item?.json?.tenantId || 
                 null;

if (!tenantId) {
  return { json: { tenantId: null, allUsageData: [], timestamp: new Date().toISOString() } };
}

// Só capturar do Supervisor
const supervisorData = $input.item.json;
const usage = supervisorData.usage || supervisorData.response?.usage || {};

const allUsageData = [];

if (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens) {
  allUsageData.push({
    operation: 'chat',
    model: supervisorData.model || 'gpt-4o-mini',
    tokensInput: usage.prompt_tokens || 0,
    tokensOutput: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    metadata: {
      workflowId: $workflow.id,
      nodeName: 'LangChain Supervisor',
      executionId: $execution.id
    }
  });
}

return {
  json: {
    tenantId: tenantId,
    allUsageData: allUsageData,
    timestamp: new Date().toISOString()
  }
};
```

---

## ✅ CHECKLIST

- [ ] Colei o código no node Code após o Supervisor
- [ ] Ajustei os nomes dos nodes conforme meu workflow
- [ ] Adicionei node HTTP Request depois do Code
- [ ] Configurei a URL do HTTP Request corretamente
- [ ] Marquei "Continue On Fail" = TRUE
- [ ] Testei o workflow
- [ ] Verifiquei os logs do backend

---

## 🆘 SE AINDA TRAVAR

1. **Use a versão ultra-simplificada** acima
2. **Verifique os logs do N8N** para ver onde está travando
3. **Teste com um tenantId hardcoded** primeiro:
   ```javascript
   const tenantId = 39; // Hardcoded para testar
   ```
4. **Me envie os logs** e eu ajudo a debugar

---

## 📝 RESUMO

Este código:
- ✅ Captura tokens do LangChain Supervisor
- ✅ Captura tokens de outros nodes OpenAI
- ✅ Não trava (try/catch em tudo)
- ✅ Sempre retorna algo válido
- ✅ Ignora nodes que não existem
- ✅ Pronto para usar

**Cole no node Code e teste!**

