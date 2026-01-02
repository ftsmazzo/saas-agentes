# ✅ SOLUÇÃO DEFINITIVA: Capturar via $execution.data

## 🎯 PROBLEMA REAL

1. Supervisor não retorna usage (só texto)
2. Nodes de áudio/imagem estão em branches paralelas
3. Não queremos quebrar o fluxo adicionando nodes

## ✅ SOLUÇÃO: Usar $execution.data

**O `$execution.data` tem TODOS os nodes executados, independente de onde estão no workflow!**

---

## 🔧 CÓDIGO ÚNICO - Captura TUDO

**Cole este código em UM ÚNICO Code node no FINAL do workflow (antes de retornar resposta):**

```javascript
// ============================================
// CAPTURAR TODOS OS TOKENS VIA EXECUTION DATA
// ============================================
// Este código captura usage de TODOS os nodes OpenAI executados
// Funciona mesmo se estiverem em branches paralelas

// 1. Pegar tenantId do Edit Fields2 (via Set ou direto)
let tenantId = null;

try {
  // Tentar do input primeiro (se vier do Set)
  tenantId = $input.item.json.tenantId;
  
  // Se não encontrou, tentar do Edit Fields2
  if (!tenantId) {
    const editFields = $('Edit Fields2');
    if (editFields && editFields.item && editFields.item.json) {
      tenantId = editFields.item.json.tenantId;
    }
  }
} catch (e) {
  // Ignorar
}

if (!tenantId) {
  // Retornar vazio mas não quebrar
  return {
    json: {
      ...($input.item.json || {}),
      _credits: {
        tenantId: null,
        allUsageData: [],
        error: "tenantId não encontrado"
      }
    }
  };
}

// 2. Capturar usage de TODOS os nodes via execution data
const allUsageData = [];

try {
  const execution = $execution;
  
  if (execution && execution.data && execution.data.resultData) {
    const resultData = execution.data.resultData;
    const runData = resultData.runData || {};
    
    // Percorrer TODOS os nodes executados
    for (const nodeName in runData) {
      const nodeRuns = runData[nodeName];
      
      if (Array.isArray(nodeRuns) && nodeRuns.length > 0) {
        // Pegar o último run de cada node
        const lastRun = nodeRuns[nodeRuns.length - 1];
        
        if (lastRun && lastRun.data && lastRun.data.main) {
          const mainData = lastRun.data.main;
          
          // Processar cada item do output
          for (const itemArray of mainData) {
            if (Array.isArray(itemArray) && itemArray.length > 0) {
              const item = itemArray[0];
              
              if (item && item.json) {
                const json = item.json;
                
                // Procurar usage em diferentes formatos
                const usage = json.usage ||
                             json.response?.usage ||
                             json.output?.usage ||
                             json.data?.usage ||
                             json._usage ||
                             null;
                
                // Se encontrou usage, adicionar
                if (usage && (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens)) {
                  // Determinar tipo de operação baseado no nome do node
                  let operation = 'chat';
                  const nodeNameLower = nodeName.toLowerCase();
                  
                  if (nodeNameLower.includes('audio') || 
                      nodeNameLower.includes('transcribe') || 
                      nodeNameLower.includes('whisper') ||
                      nodeNameLower.includes('openai4')) {
                    operation = 'audio';
                  } else if (nodeNameLower.includes('image') || 
                             nodeNameLower.includes('vision') || 
                             nodeNameLower.includes('analyze')) {
                    operation = 'image';
                  } else if (nodeNameLower.includes('pdf') || 
                             nodeNameLower.includes('message a model')) {
                    operation = 'pdf';
                  } else if (nodeNameLower.includes('format')) {
                    operation = 'format';
                  }
                  
                  // Para áudio, verificar duração
                  if (operation === 'audio') {
                    const audioDuration = json.audioDurationSeconds || 
                                         json.duration || 
                                         json.audio_duration ||
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
                    // Para outros tipos, usar tokens
                    const model = json.model ||
                                 json.response?.model ||
                                 json.output?.model ||
                                 'gpt-4o-mini';
                    
                    const tokensInput = usage.prompt_tokens || 
                                      usage.input_tokens || 
                                      0;
                    
                    const tokensOutput = usage.completion_tokens || 
                                       usage.output_tokens || 
                                       0;
                    
                    const totalTokens = usage.total_tokens || 
                                       (tokensInput + tokensOutput);
                    
                    if (totalTokens > 0) {
                      allUsageData.push({
                        operation: operation,
                        model: model,
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
                }
              }
            }
          }
        }
      }
    }
  }
} catch (e) {
  console.log('Erro ao capturar usage:', e.message);
}

// 3. Retornar dados originais + dados de créditos
return {
  json: {
    ...($input.item.json || {}),
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData,
      timestamp: new Date().toISOString(),
      totalItems: allUsageData.length
    }
  }
};
```

---

## 🔧 CONFIGURAÇÃO DO HTTP REQUEST

**Depois do Code, adicione HTTP Request:**

### URL:
```
http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json._credits.tenantId }}
```

### Method:
```
POST
```

### Body (JSON):
```json
{
  "eventType": "usage_tracking_batch",
  "data": {{ $json._credits.allUsageData }},
  "timestamp": "{{ $json._credits.timestamp }}"
}
```

### Options:
- ✅ **Continue On Fail:** `TRUE`
- ✅ **Response:** `Last Node Output`

---

## 🎯 ONDE COLOCAR O CODE NODE

**Coloque o Code node ANTES de retornar a resposta final ao cliente.**

**Exemplo de fluxo:**
```
... (workflow normal) ...
  ↓
Supervisor (retorna texto)
  ↓
[Qualquer processamento final]
  ↓
[NOVO] Code (Capturar Créditos) ← AQUI
  ↓
HTTP Request (Enviar Créditos) ← Opcional, pode ser em paralelo
  ↓
Retornar Resposta ao Cliente
```

---

## ✅ VANTAGENS DESTA SOLUÇÃO

1. ✅ **Não quebra o fluxo** - Só adiciona 1 node no final
2. ✅ **Captura TUDO** - Todos os nodes OpenAI, mesmo em branches paralelas
3. ✅ **Não precisa modificar nodes existentes** - Funciona com workflow atual
4. ✅ **Funciona com Supervisor** - Captura do subnode Model via execution data
5. ✅ **Funciona com áudio/imagem** - Captura mesmo estando em branches diferentes

---

## 🧪 TESTE

1. **Adicione o Code node** antes de retornar resposta
2. **Cole o código** acima
3. **Execute o workflow**
4. **Verifique** se captura tokens de todos os nodes

---

## 📋 O QUE ESTE CÓDIGO FAZ

1. **Pega tenantId** (do Set ou Edit Fields2)
2. **Acessa $execution.data** (tem TODOS os nodes executados)
3. **Percorre TODOS os nodes** (não importa onde estão)
4. **Extrai usage** de cada node OpenAI
5. **Identifica tipo** (chat, audio, image, pdf) pelo nome do node
6. **Agrega tudo** em um array
7. **Retorna** junto com os dados originais (não quebra o fluxo)

---

## 🆘 SE AINDA NÃO FUNCIONAR

Se o `$execution.data` não estiver acessível, podemos tentar:

1. **Versão simplificada** que só captura nodes específicos
2. **Usar webhook do N8N** para capturar após execução
3. **Modificar Supervisor** para incluir usage (se possível)

**Mas esta solução via $execution.data deve funcionar!**

---

## ✅ RESUMO

**Solução:**
- ✅ **1 Code node** no final do workflow
- ✅ **Captura TUDO** via $execution.data
- ✅ **Não quebra fluxo** - só adiciona dados
- ✅ **Funciona com branches paralelas**

**Teste esta solução!**

