# 🔧 Corrigir tenantId retornando NaN

## ❌ Problema

O campo `tenantId` está retornando `NaN` (Not a Number).

## 🔍 Causas Possíveis

1. **webhookUrl não tem o formato esperado** (ex: `tenant_10`)
2. **webhookUrl pode ser apenas o path** (ex: `agentemestre` ao invés de `tenant_10`)
3. **webhookUrl pode não existir** no JSON
4. **Formato diferente** do esperado

## ✅ Soluções

### Solução 1: Expressão Mais Robusta (Recomendada)

**Campo `tenantId`:**
- **Name:** `tenantId`
- **Value:** 
```
{{$json.webhookUrl ? (parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').replace('tenant_', '').replace('tenant', '')) || null) : null}}
```

**Explicação:**
- Verifica se `webhookUrl` existe
- Remove `tenant_` e `tenant` antes de converter
- Retorna `null` se não conseguir converter

### Solução 2: Extrair do Path do Webhook (Alternativa)

Se o `webhookUrl` não tem o formato correto, tente extrair do `path`:

**Campo `tenantId`:**
- **Name:** `tenantId`
- **Value:**
```
{{$json.path ? parseInt($json.path.split('_').pop()) : ($json.webhookUrl ? parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').replace('tenant_', '').replace('tenant', '')) : null)}}
```

### Solução 3: Usar Nó Code (Mais Controle)

Se as expressões não funcionarem, use um nó **Code** antes do **Set**:

```javascript
// Extrair tenantId de múltiplas fontes possíveis
let tenantId = null;

// Tentar 1: Do path
if ($json.path) {
  const pathParts = $json.path.split('_');
  if (pathParts.length > 1) {
    tenantId = parseInt(pathParts[pathParts.length - 1]);
  }
}

// Tentar 2: Do webhookUrl
if (!tenantId && $json.webhookUrl) {
  const urlParts = $json.webhookUrl.split('/');
  const lastPart = urlParts[urlParts.length - 1].replace(/\s+/g, '');
  const cleanPart = lastPart.replace('tenant_', '').replace('tenant', '');
  tenantId = parseInt(cleanPart);
}

// Tentar 3: Do body (se vier do webhook)
if (!tenantId && $json.body && $json.body.tenantId) {
  tenantId = parseInt($json.body.tenantId);
}

// Tentar 4: Do query (se vier na URL)
if (!tenantId && $json.query && $json.query.tenantId) {
  tenantId = parseInt($json.query.tenantId);
}

return {
  json: {
    ...$json,
    tenantId: tenantId || null,
    _debug: {
      path: $json.path,
      webhookUrl: $json.webhookUrl,
      extractedTenantId: tenantId
    }
  }
};
```

Depois, no nó **Set**, use:
- **Name:** `tenantId`
- **Value:** `{{ $json.tenantId }}`

---

## 🔍 Debug: Verificar Formato Real

Para descobrir o formato real, adicione um nó **Code** temporário:

```javascript
return {
  json: {
    _debug: {
      webhookUrl: $json.webhookUrl,
      path: $json.path,
      body: $json.body,
      query: $json.query,
      allKeys: Object.keys($json)
    }
  }
};
```

Execute e veja qual campo contém o tenantId.

---

## ✅ Solução Rápida (Teste Esta Primeiro)

**Campo `tenantId` no nó Set:**
- **Name:** `tenantId`
- **Value:**
```
{{$json.webhookUrl ? parseInt($json.webhookUrl.split('/').pop().replace(/\s+/g, '').replace(/^tenant_?/i, '')) : null}}
```

Esta versão:
- Remove `tenant_` ou `tenant` (case insensitive)
- Funciona mesmo se não tiver o underscore
- Retorna `null` se não conseguir converter

---

## 🎯 Exemplo: Se webhookUrl for "agentemestre"

Se o `webhookUrl` for apenas `agentemestre` (sem número), você precisa:

1. **Verificar de onde vem o tenantId real**
   - Pode estar no `body` do webhook
   - Pode estar no `path` da requisição
   - Pode precisar buscar no banco de dados

2. **Buscar tenantId pelo webhookUrl no banco:**
```sql
SELECT "tenantId" FROM tenants 
WHERE "evolutionInstanceName" = '{{ $json.webhookUrl }}'
LIMIT 1;
```

---

## 📝 Checklist de Debug

1. [ ] Execute o nó Set e veja o valor de `webhookUrl`
2. [ ] Verifique se o formato é `tenant_10` ou diferente
3. [ ] Se for diferente, ajuste a expressão conforme o formato real
4. [ ] Use o nó Code de debug para ver todos os campos disponíveis
5. [ ] Se necessário, busque tenantId no banco de dados

---

## 🔧 Expressão Final (Mais Segura)

```
{{$json.webhookUrl ? (function() {
  const url = $json.webhookUrl.split('/').pop().replace(/\s+/g, '');
  const match = url.match(/(\d+)$/);
  return match ? parseInt(match[1]) : null;
})() : null}}
```

Esta versão:
- Pega a última parte da URL
- Procura por números no final
- Retorna o número encontrado ou `null`

