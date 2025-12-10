# Configurar Webhook Chatwoot via N8N

## Passo 1: Copiar URL do Webhook do N8N

1. No N8N, abra o workflow que você já criou
2. Clique no nó **Webhook**
3. Copie a URL que aparece (ex: `https://seu-n8n.com/webhook/webhook-chatwoot`)

## Passo 2: Adicionar no EasyPanel

1. Acesse o EasyPanel
2. Vá em **Environment Variables** (Variáveis de Ambiente)
3. Adicione:
   - **Nome**: `N8N_CREATE_WEBHOOK_WORKFLOW_URL`
   - **Valor**: `https://seu-n8n.com/webhook/webhook-chatwoot` (a URL que você copiou)
4. Salve e reinicie o container

## Passo 3: Configurar o Workflow N8N

No nó **HTTP Request** do seu workflow, configure:

**URL:**
```
https://saas-agentes-chatwoot.90qhxz.easypanel.host/api/v1/accounts/1/webhooks
```

**Headers:**
- `api_access_token`: `7F6cJaYU9puZQrJVBY2bjAPo`
- `Content-Type`: `application/json`

**Body (JSON):**
```json
{
  "url": "{{ $json.webhookUrl }}",
  "name": "Webhook Tenant {{ $json.tenantId }}",
  "subscriptions": ["message_created", "conversation_created"]
}
```

## Pronto!

Quando criar um novo tenant, o webhook será criado automaticamente no Chatwoot.
