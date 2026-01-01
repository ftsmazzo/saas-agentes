# ✅ SOLUÇÃO CORRIGIDA: Sem Looping

## 🐛 PROBLEMA IDENTIFICADO

O código anterior estava causando loop porque tentava acessar nodes que podem não existir ou estar em estados diferentes.

## ✅ SOLUÇÃO CORRIGIDA

Código mais seguro que:
- ✅ Não causa loops
- ✅ Trata todos os erros
- ✅ Só executa uma vez
- ✅ Não acessa nodes que não existem

---

## 🔧 CÓDIGO CORRIGIDO PARA O NODE CODE

**Cole este código no node "Code" conectado no "Done" do Loop:**

```javascript
// ============================================
// CAPTURAR USOS - VERSÃO SEGURA (SEM LOOP)
// ============================================

// 1. Pegar tenantId de forma segura
let tenantId = null;

try {
  tenantId = $json.tenantId || 
             $('Edit Fields2')?.item?.json?.tenantId || 
             $('Set')?.item?.json?.tenantId;
  
  // Se ainda não encontrou, tentar extrair do webhook
  if (!tenantId) {
    const webhook = $('Webhook');
    if (webhook && webhook.item && webhook.item.json) {
      const webhookUrl = webhook.item.json.webhookUrl || '';
      const match = webhookUrl.match(/tenant[_\s]*(\d+)/i);
      if (match) {
        tenantId = parseInt(match[1]);
      }
    }
  }
} catch (e) {
  console.log('Erro ao buscar tenantId:', e.message);
}

if (!tenantId) {
  console.log('⚠️ TenantId não encontrado, pulando registro');
  return { json: {} };
}

// 2. Array para armazenar usos
const allUsageData = [];

// 3. Função auxiliar para capturar uso de um node
function captureUsage(nodeName, operation, defaultModel) {
  try {
    const node = $(nodeName);
    if (!node || !node.item || !node.item.json) {
      return; // Node não existe ou não tem dados
    }
    
    const data = node.item.json;
    const usage = data.usage || data.response?.usage || data.output?.usage;
    
    if (!usage) {
      return; // Não tem dados de uso
    }
    
    const model = data.model || data.response?.model || data.output?.model || defaultModel;
    
    // Para áudio (Whisper), tratar diferente
    if (operation === 'audio') {
      const audioDuration = data.audioDurationSeconds || data.duration || data.audio_duration || 0;
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
      // Para outros tipos (chat, image, pdf)
      allUsageData.push({
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
      });
    }
  } catch (e) {
    // Ignorar erros silenciosamente - node pode não existir
    console.log(`Node ${nodeName} não encontrado ou sem dados`);
  }
}

// 4. Capturar usos de cada node (com try/catch individual)
captureUsage('OpenAI Chat Model', 'chat', 'gpt-4o-mini');
captureUsage('OpenAI Split', 'chat', 'gpt-4o-mini');
captureUsage('OpenAI4', 'audio', 'whisper-1');
captureUsage('Analyze image', 'image', 'gpt-4o-vision');
captureUsage('Message a model', 'pdf', 'gpt-4o-mini');

// 5. Se encontrou algum uso, retornar para envio
if (allUsageData.length > 0) {
  return {
    json: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString()
    }
  };
}

// 6. Se não encontrou nenhum uso, retornar vazio (não causa loop)
return { 
  json: { 
    tenantId: tenantId, 
    allUsageData: [],
    timestamp: new Date().toISOString()
  } 
};
```

---

## 🔧 CONFIGURAÇÃO DO HTTP REQUEST

**URL:**
```
http://localhost:3000/api/webhooks/n8n/{{ $json.tenantId }}
```

**OU se estiver em outro servidor:**
```
http://IP_DO_SERVIDOR:3000/api/webhooks/n8n/{{ $json.tenantId }}
```

**Body (JSON):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData }}",
  "timestamp": "={{ $json.timestamp }}"
}
```

**IMPORTANTE:**
- ✅ Marcar **"Continue On Fail"** = TRUE
- ✅ Não esperar resposta

---

## 🐛 O QUE FOI CORRIGIDO

1. **Try/catch individual** para cada node
2. **Verificação de existência** antes de acessar
3. **Retorno garantido** - sempre retorna algo, nunca fica em loop
4. **Função auxiliar** - código mais limpo e seguro
5. **Tratamento de erros** - ignora nodes que não existem

---

## 🧪 TESTE NOVAMENTE

1. **Substitua o código** no node Code pelo código corrigido acima
2. **Salve** o workflow
3. **Execute** o workflow
4. **Verifique** se não fica em loop

---

## ⚠️ SE AINDA DER PROBLEMA

Se ainda ficar em loop, use esta versão ULTRA SIMPLIFICADA:

```javascript
// VERSÃO ULTRA SIMPLES - SÓ RETORNA DADOS BÁSICOS
const tenantId = $json.tenantId || $('Edit Fields2')?.item?.json?.tenantId || null;

if (!tenantId) {
  return { json: {} };
}

// Retornar apenas estrutura básica - sem tentar acessar nodes
return {
  json: {
    tenantId: tenantId,
    allUsageData: [], // Vazio por enquanto - vamos adicionar depois
    timestamp: new Date().toISOString()
  }
};
```

**Depois que funcionar, vamos adicionando os nodes um por um.**

---

## 🆘 DEBUG

Se quiser ver o que está acontecendo, adicione logs:

```javascript
console.log('TenantId:', tenantId);
console.log('All usage data:', allUsageData.length);
console.log('Workflow ID:', $workflow.id);
```

**Verifique os logs do N8N** para ver o que está acontecendo.

---

## ✅ CHECKLIST

- [ ] Substituir código pelo código corrigido
- [ ] Salvar workflow
- [ ] Testar - não deve ficar em loop
- [ ] Verificar logs do N8N
- [ ] Se funcionar, verificar se dados chegam no backend

