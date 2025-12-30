# 🔧 Como Extrair tenantId no N8N (Nó Set)

## 📋 Situação

Você já tem um campo que extrai o webhook URL:
```
{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '') }}
```

Isso retorna algo como: `tenant_10` ou `10`

## ✅ Solução: Adicionar Segundo Campo no Nó Set

### Configuração do Nó Set

**Campo 1 (já existe):**
- **Name:** `webhookPath` (ou o nome que você já usa)
- **Value:** `{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '') }}`

**Campo 2 (novo - para extrair apenas o ID):**
- **Name:** `tenantId`
- **Value:** `{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop() }}`

---

## 🔍 Explicação

### Código Completo:
```
{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop() }}
```

### Como Funciona:
1. `$json.webhookUrl` - URL completa do webhook
2. `.split('/').pop()` - Pega a última parte da URL (ex: `tenant_10`)
3. `.replace(/\s+/g, '')` - Remove espaços em branco
4. `.split('_').pop()` - Divide por `_` e pega a última parte (ex: `10`)
5. Resultado: `10` (apenas o número do tenant)

---

## 📝 Exemplo Completo no Nó Set

### Configuração:

| Name | Value | Type |
|------|-------|------|
| `webhookPath` | `{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '') }}` | String |
| `tenantId` | `{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop() }}` | Number |

**Ou se quiser garantir que seja número:**

| Name | Value | Type |
|------|-------|------|
| `webhookPath` | `{{$json.webhookUrl.split('/').pop().replace(/\s+/g, '') }}` | String |
| `tenantId` | `{{parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop())}}` | Number |

---

## 🎯 Alternativa: Usar Expressão Mais Robusta

Se o formato pode variar, use esta versão mais robusta:

```
{{parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').replace('tenant_', '').replace('tenant', ''))}}
```

Isso funciona mesmo se vier:
- `tenant_10` → `10`
- `tenant10` → `10`
- `10` → `10`

---

## ✅ Resultado

Após configurar o nó Set, você terá:

```json
{
  "webhookUrl": "https://saas-agentes-n8n.90qhxz.easypanel.host/webhook/tenant_10",
  "webhookPath": "tenant_10",
  "tenantId": 10
}
```

Agora você pode usar `{{ $json.tenantId }}` em todas as queries SQL!

---

## 📚 Exemplo de Uso em Query SQL

```sql
SELECT * FROM "chatMessages" 
WHERE "tenantId" = {{ $json.tenantId }}
  AND phone = '{{ $json.phone }}';
```

---

## 🔧 Troubleshooting

### Se `tenantId` vier como string:
Use `parseInt()`:
```
{{parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop())}}
```

### Se o formato for diferente:
Ajuste o `.split('_')` para o separador correto:
- Se for `tenant-10`: `.split('-').pop()`
- Se for `tenant.10`: `.split('.').pop()`

### Para testar:
Adicione um nó **Code** temporário para ver o resultado:
```javascript
return {
  json: {
    webhookUrl: $json.webhookUrl,
    webhookPath: $json.webhookUrl.split('/').pop().replace(/\s+/g, ''),
    tenantId: parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').split('_').pop())
  }
};
```

