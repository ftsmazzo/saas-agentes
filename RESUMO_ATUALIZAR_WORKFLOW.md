# 🎯 Resumo: Atualizar Workflow N8N

## ✅ O Que Foi Feito

1. ✅ Tabelas criadas no PostgreSQL
2. ✅ pgvector instalado
3. ✅ Script SQL executado com sucesso

## 🔄 O Que Precisa Fazer Agora

### 1. Extrair tenantId do Webhook

O webhook do N8N é: `/webhook/tenant_10` (onde `10` é o tenantId)

**No primeiro nó do workflow, adicione:**

```javascript
// Nó Code (JavaScript)
const webhookPath = $json.path || '';
const tenantId = webhookPath.split('_')[1] || webhookPath.split('/').pop();

return {
  json: {
    ...$json,
    tenantId: parseInt(tenantId) || null
  }
};
```

### 2. Atualizar Todas as Queries SQL

**❌ ANTES (Template):**
```sql
SELECT * FROM chat_messages WHERE phone = '{{ $json.phone }}';
```

**✅ DEPOIS (Multi-Tenant):**
```sql
SELECT * FROM "chatMessages" 
WHERE "tenantId" = {{ $json.tenantId }}
  AND phone = '{{ $json.phone }}';
```

### 3. Principais Mudanças

| Template Original | Novo (Multi-Tenant) |
|------------------|-------------------|
| `chat_messages` | `"chatMessages"` |
| `dados_cliente` | `"clientData"` |
| `chats` | `conversations` |
| Sem `tenantId` | **SEMPRE** incluir `"tenantId"` |

### 4. Checklist Rápido

- [ ] Extrair `tenantId` do webhook
- [ ] Todas as queries SELECT: `WHERE "tenantId" = {{ $json.tenantId }}`
- [ ] Todas as queries INSERT: incluir `"tenantId"` no VALUES
- [ ] Todas as queries UPDATE: `WHERE "tenantId" = {{ $json.tenantId }}`
- [ ] Usar nomes corretos: `"chatMessages"`, `"clientData"`, etc.

---

## 📚 Guias Completos

- `GUIA_ATUALIZAR_WORKFLOW_N8N.md` - Guia completo passo a passo
- `GUIA_N8N_TENANT_ISOLATION.md` - Exemplos de queries
- `ARQUITETURA_MULTI_TENANT.md` - Explicação da arquitetura

---

## 🚨 Regra de Ouro

**TODAS as queries SQL DEVEM filtrar por `tenantId`!**

Sem isso, você pode vazar dados de outros clientes! 🔴

