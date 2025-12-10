# Configurar Workflow N8N para Criar Webhook Chatwoot

## Visão Geral

O sistema agora usa um workflow N8N existente para criar webhooks no Chatwoot automaticamente. Isso é mais confiável porque usa a infraestrutura do N8N que já está funcionando.

## Passo 1: Criar/Configurar Workflow no N8N

1. Acesse o N8N
2. Crie um novo workflow ou use o workflow existente que você já criou
3. Configure o workflow com:

### Estrutura do Workflow:

```
[Webhook] → [HTTP Request]
```

### Configuração do Nó Webhook:
- **HTTP Method**: POST
- **Path**: `webhook-chatwoot` (ou o path que você preferir)
- **Response Mode**: Last Node

### Configuração do Nó HTTP Request:
- **Method**: POST
- **URL**: `https://{CHATWOOT_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}/webhooks`
  - Exemplo: `https://saas-agentes-chatwoot.90qhxz.easypanel.host/api/v1/accounts/1/webhooks`
- **Send Headers**: Sim
- **Headers**:
  - `api_access_token`: `{{ $env.CHATWOOT_API_TOKEN }}` ou valor direto
  - `Content-Type`: `application/json`
- **Send Body**: Sim
- **Body Content Type**: JSON
- **JSON Body**:
```json
{
  "url": "{{ $json.webhookUrl }}",
  "name": "Webhook Tenant {{ $json.tenantId }}",
  "subscriptions": [
    "message_created",
    "conversation_created"
  ]
}
```

### Dados que o Workflow Receberá:
O workflow receberá via POST no webhook:
```json
{
  "tenantId": 1,
  "webhookUrl": "https://n8n.com/webhook/tenant_1",
  "chatwootAccountId": "1",
  "chatwootUrl": "https://chatwoot.com",
  "chatwootToken": "token123"
}
```

## Passo 2: Ativar o Workflow

1. No N8N, ative o workflow (toggle no canto superior direito)
2. Copie a URL do webhook (aparece quando você clica no nó Webhook)
   - Exemplo: `https://n8n.com/webhook/webhook-chatwoot`

## Passo 3: Configurar Variável de Ambiente

Adicione no `.env` do servidor:

```env
N8N_CREATE_WEBHOOK_WORKFLOW_URL=https://seu-n8n.com/webhook/webhook-chatwoot
```

**Importante**: Use a URL completa do webhook do N8N, não a URL da API.

## Passo 4: Testar

1. Crie um novo tenant no sistema
2. Verifique os logs do servidor:
   ```
   [N8N] Chamando workflow via webhook para criar webhook Chatwoot do tenant X...
   [N8N] Workflow executado. Status: 200
   ```
3. Verifique no Chatwoot se o webhook foi criado:
   - Acesse Chatwoot → Settings → Integrations → Webhooks
   - Deve aparecer um webhook apontando para o N8N do tenant

## Exemplo de Workflow JSON

Você pode importar este workflow no N8N:

```json
{
  "name": "Create Chatwoot Webhook",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-chatwoot",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-208, 0],
      "id": "webhook-node",
      "name": "Webhook"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.CHATWOOT_URL }}/api/v1/accounts/={{ $env.CHATWOOT_ACCOUNT_ID }}/webhooks",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "api_access_token",
              "value": "={{ $env.CHATWOOT_API_TOKEN }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"url\": \"{{ $json.webhookUrl }}\",\n  \"name\": \"Webhook Tenant {{ $json.tenantId }}\",\n  \"subscriptions\": [\n    \"message_created\",\n    \"conversation_created\"\n  ]\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [-16, 0],
      "id": "http-request",
      "name": "HTTP Request"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "HTTP Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1"
  }
}
```

## Troubleshooting

### Webhook não é criado
1. Verifique se o workflow está ativo no N8N
2. Verifique se a URL do webhook está correta no `.env`
3. Verifique os logs do N8N para ver se houve erro na execução
4. Verifique se as variáveis de ambiente do Chatwoot estão configuradas no N8N

### Erro 404 ao chamar webhook
- Verifique se a URL do webhook está correta
- Verifique se o workflow está ativo
- Verifique se o path do webhook está correto

### Erro ao criar webhook no Chatwoot
- Verifique se o token do Chatwoot está correto
- Verifique se a URL do Chatwoot está correta
- Verifique se o account ID está correto
- Verifique os logs do N8N para ver a resposta do Chatwoot

