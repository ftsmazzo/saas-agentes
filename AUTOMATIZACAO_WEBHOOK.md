# 🔄 Automação de Webhook Chatwoot → N8N

## ✅ O que foi implementado

Agora, quando um tenant é criado, o sistema **automaticamente**:

1. ✅ Cria instância Evolution API
2. ✅ Clona workflow N8N (com webhook: `/webhook/webhook/tenant_{id}`)
3. ✅ **NOVO:** Cria webhook no Chatwoot apontando para o N8N
4. ✅ Configura evento "message_created" automaticamente

## 🎯 Fluxo Automatizado

```
Tenant Criado
    ↓
Evolution API (instância criada)
    ↓
N8N Workflow (clonado e ativado)
    ↓
Webhook N8N: https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/webhook/tenant_{id}
    ↓
Chatwoot Webhook (CRIADO AUTOMATICAMENTE)
    - URL: aponta para webhook N8N acima
    - Nome: tenant_{id}
    - Evento: message_created
    ↓
✅ Agente pronto para uso!
```

## 📋 Quando acontece

A criação do webhook acontece **automaticamente** durante o provisionamento:

1. **Via Stripe Webhook** (quando cliente compra)
2. **Via Admin Panel** (quando admin cria tenant manualmente)

## 🔧 Configuração

O webhook é criado com:
- **URL:** `https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/webhook/tenant_{id}`
- **Nome:** `tenant_{id}`
- **Eventos:** `["message_created"]`

## ⚠️ Tratamento de Erros

Se a criação do webhook falhar:
- ❌ **NÃO** quebra o provisionamento
- ⚠️ Log de warning é criado
- 📝 Webhook pode ser criado manualmente depois

## 🧪 Como Testar

1. Crie um novo tenant (via admin ou Stripe)
2. Verifique os logs do provisionamento
3. Acesse Chatwoot → Integrations → Webhooks
4. Deve aparecer o webhook `tenant_{id}` automaticamente

## 🔄 Próximos Passos

Após escanear o QR code do WhatsApp:
- ✅ Evolution conecta
- ✅ Chatwoot recebe mensagens
- ✅ Webhook envia para N8N
- ✅ Agente responde automaticamente

**Tudo funcionando sem intervenção manual!** 🎉

