# Correção do workflowId no Code Node do N8N

## Problema Identificado

O código do Code node que calcula créditos não está conseguindo pegar o `workflowId`, ficando `null`.

## Código Atual (com problema)

```javascript
metadata: {
  workflowId: inputData.workflowId || $workflow.id,
  // ...
}
```

## Solução

O `$workflow.id` pode não estar disponível no contexto do Code node. Use uma das seguintes alternativas:

### Opção 1: Usar `$workflow.id` diretamente (recomendado)

```javascript
// No início do código, antes de usar
const workflowId = $workflow.id || inputData.workflowId || null;

// Depois, no metadata:
metadata: {
  workflowId: workflowId,
  executionId: $execution.id || inputData.executionId,
  nodeName: 'LangChain Supervisor',
  // ...
}
```

### Opção 2: Buscar do contexto de execução

```javascript
// Tentar diferentes formas de obter o workflowId
const workflowId = $workflow.id || 
                   $('Buscar Configurações Agente').first().json.workflowId ||
                   inputData.workflowId ||
                   null;
```

### Opção 3: Passar explicitamente de um node anterior

Se você tem um node que já tem o workflowId, passe explicitamente:

```javascript
// No node anterior, adicione ao JSON:
{
  ...inputData,
  workflowId: $workflow.id
}

// No Code node, use:
metadata: {
  workflowId: inputData.workflowId || $workflow.id || null,
  // ...
}
```

## Código Completo Corrigido

```javascript
// ============================================
// CÓDIGO COMPLETO - CAPTURAR CRÉDITOS (CORRIGIDO)
// ============================================

const inputData = $input.item.json;

// 1. Pegar tenantId
const tenantId = inputData.tenantId || null;

// 2. Pegar workflowId (CORRIGIDO)
const workflowId = $workflow.id || inputData.workflowId || null;

if (!tenantId) {
  return { 
    json: { 
      ...inputData,
      _credits: { 
        tenantId: null, 
        allUsageData: [],
        timestamp: new Date().toISOString()
      } 
    } 
  };
}

// ... resto do código permanece igual ...

// No metadata, usar o workflowId capturado:
metadata: {
  textLength: responseText.length,
  formula: 'Baseada em dados reais + ajustada para mensagens curtas + 35% margem',
  originalModel: selectedModel,
  workflowId: workflowId, // ✅ USAR A VARIÁVEL CAPTURADA
  nodeName: 'LangChain Supervisor',
  executionId: $execution.id || inputData.executionId
}
```

## Verificação

Após aplicar a correção, verifique nos logs do backend que o `workflowId` está sendo recebido corretamente no metadata das transações.

