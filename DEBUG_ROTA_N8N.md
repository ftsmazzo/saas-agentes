# 🔍 Debug: Rota N8N Webhook 404

## ✅ Correções Aplicadas

1. **Logs de debug** em todas as requisições `/api/webhooks/n8n/*`
2. **Handler 404 customizado** que mostra exatamente qual rota não foi encontrada
3. **Correção no setupVite** para não capturar rotas de API em desenvolvimento
4. **Log de confirmação** quando a rota é registrada no servidor

## 🚨 IMPORTANTE: Reiniciar o Servidor

**O servidor PRECISA ser reiniciado após o deploy!**

Se você não reiniciou o servidor após o último deploy, a rota antiga ainda está em memória e não vai funcionar.

### Como verificar se a rota está registrada:

Após reiniciar o servidor, você deve ver no log:

```
✅ [Routes] Rota N8N webhook registrada: POST /api/webhooks/n8n/:tenantId
```

**Se não aparecer essa mensagem, a rota não foi registrada!**

---

## 📋 Passos para Resolver

### 1. Reiniciar o Servidor no EasyPanel

1. Vá para o EasyPanel
2. Encontre o serviço/aplicação
3. Clique em **"Restart"** ou **"Reiniciar"**
4. Aguarde o servidor reiniciar completamente

### 2. Verificar os Logs

Após reiniciar, verifique os logs do servidor. Você deve ver:

```
✅ [Routes] Rota N8N webhook registrada: POST /api/webhooks/n8n/:tenantId
🚀 Server running on http://localhost:3000/
```

### 3. Testar o Webhook

Quando o N8N chamar o webhook, você verá nos logs:

```
[Debug] 🔍 Requisição recebida: POST /api/webhooks/n8n/39
[Debug] 📍 Params: { tenantId: '39' }
[N8N Webhook] 📥 Recebido: POST /api/webhooks/n8n/39
[N8N Webhook] ✅ tenantId válido: 39
```

**Se você ver `[404] ❌ Rota de API não encontrada`**, significa que a requisição está chegando mas a rota não foi registrada corretamente.

---

## 🔧 Se Ainda Não Funcionar

### Verificar se o código foi atualizado:

1. No EasyPanel, verifique se o código foi realmente atualizado
2. Verifique se o build foi feito corretamente
3. Verifique se há erros de compilação nos logs

### Testar a rota manualmente:

Use curl ou Postman para testar:

```bash
curl -X POST http://195.201.150.56:3000/api/webhooks/n8n/39 \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "usage_tracking_batch",
    "data": [],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }'
```

**Resposta esperada:**
```json
{
  "success": true
}
```

**Se retornar 404:**
- A rota não está registrada
- O servidor não foi reiniciado
- Há um problema com o build

---

## 📝 Logs Esperados

### Ao iniciar o servidor:
```
✅ [Routes] Rota N8N webhook registrada: POST /api/webhooks/n8n/:tenantId
🚀 Server running on http://localhost:3000/
```

### Quando o webhook é chamado:
```
[Debug] 🔍 Requisição recebida: POST /api/webhooks/n8n/39
[Debug] 📍 Params: { tenantId: '39' }
[N8N Webhook] 📥 Recebido: POST /api/webhooks/n8n/39
[N8N Webhook] 📦 Body: { ... }
[N8N Webhook] ✅ tenantId válido: 39
[N8N Webhook] ✅ Uso registrado para tenant 39: { ... }
```

---

## ⚠️ Se Continuar com 404

Se mesmo após reiniciar o servidor você ainda ver:

```
[404] ❌ Rota de API não encontrada: POST /api/webhooks/n8n/39
```

**Isso significa:**
1. A rota não está sendo registrada (verifique se há erros no código)
2. Há um problema com a ordem das rotas
3. O build não incluiu as mudanças

**Solução:**
- Verifique os logs de inicialização do servidor
- Verifique se há erros de compilação
- Verifique se o código foi realmente atualizado no servidor

---

## ✅ Checklist

- [ ] Servidor foi reiniciado após o deploy
- [ ] Log mostra: `✅ [Routes] Rota N8N webhook registrada`
- [ ] Teste manual com curl retorna 200 (não 404)
- [ ] Logs mostram requisições chegando quando N8N chama

**Se todos os itens estão marcados e ainda não funciona, me envie os logs completos do servidor!**

