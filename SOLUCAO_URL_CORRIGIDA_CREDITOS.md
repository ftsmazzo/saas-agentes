# ✅ SOLUÇÃO: URL Corrigida com TenantId

## 🐛 PROBLEMA

A URL está sendo chamada sem o `tenantId`:
- ❌ `POST /api/webhooks/n8n/` (sem tenantId)
- ✅ `POST /api/webhooks/n8n/1` (com tenantId)

Isso acontece porque `{{ $json.tenantId }}` está retornando vazio.

## ✅ SOLUÇÃO: Garantir TenantId na URL

### Configuração do HTTP Request

**URL - Use uma destas opções:**

#### Opção 1: Com fallback hardcoded (para testar)

```
http://localhost:3000/api/webhooks/n8n/{{ $json.tenantId || $('Edit Fields2').item.json.tenantId || 1 }}
```

#### Opção 2: Extrair do webhook URL (mais confiável)

```
http://localhost:3000/api/webhooks/n8n/{{ $('Webhook').item.json.webhookUrl.split('/').pop().replace(/tenant[_\s]*/i, '').replace(/\D/g, '') || 1 }}
```

#### Opção 3: Usar expressão mais simples

```
http://localhost:3000/api/webhooks/n8n/{{ parseInt($('Edit Fields2').item.json.tenantId) || 1 }}
```

**IMPORTANTE:** Sempre tenha um fallback (|| 1) para garantir que a URL seja válida.

---

## 🔧 CONFIGURAÇÃO COMPLETA DO HTTP REQUEST

### Aba "Parameters":

1. **Method:** POST

2. **URL:** Cole uma das opções acima

3. **Authentication:** None

### Aba "Body":

1. **Body Content Type:** JSON

2. **Body:**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData || [] }}",
  "timestamp": "={{ $json.timestamp || $now.toISO() }}"
}
```

### Aba "Options":

1. **Continue On Fail:** ✅ TRUE
2. **Response:** Last Response

---

## 🧪 TESTE A URL PRIMEIRO

Antes de testar o workflow completo, teste se a URL funciona:

### No N8N, crie um workflow de teste simples:

1. **Webhook** (entrada)
2. **Code** com este código:
```javascript
return {
  json: {
    tenantId: 1,
    allUsageData: [],
    timestamp: new Date().toISOString()
  }
};
```

3. **HTTP Request:**
   - **URL:** `http://localhost:3000/api/webhooks/n8n/1`
   - **Method:** POST
   - **Body:**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "=[]",
  "timestamp": "={{ $now.toISO() }}"
}
```

4. **Execute** e verifique se retorna 200

Se funcionar, o problema é só a expressão do tenantId no workflow principal.

---

## 🔍 DIAGNÓSTICO

### Verificar se tenantId existe:

No node Code, adicione logs:

```javascript
console.log('JSON atual:', JSON.stringify($json, null, 2));
console.log('TenantId do JSON:', $json.tenantId);
console.log('TenantId do Edit Fields2:', $('Edit Fields2')?.item?.json?.tenantId);

const tenantId = $json.tenantId || $('Edit Fields2')?.item?.json?.tenantId || 1;

console.log('TenantId final:', tenantId);

return {
  json: {
    tenantId: tenantId,
    allUsageData: [],
    timestamp: new Date().toISOString()
  }
};
```

**Execute e veja os logs** para descobrir onde o tenantId realmente está.

---

## ✅ SOLUÇÃO DEFINITIVA: Hardcode Temporário

Para testar se o webhook funciona, use tenantId hardcoded temporariamente:

**URL:**
```
http://localhost:3000/api/webhooks/n8n/1
```

**(Substitua `1` pelo ID do seu tenant)**

Depois que funcionar, troque pela expressão dinâmica.

---

## 🆘 SE AINDA DER 404

Se mesmo com tenantId hardcoded der 404, o problema é a URL do backend:

1. **Verifique se o backend está rodando:**
   - Teste: `http://localhost:3000/api/health`
   - Deve retornar: `{"status":"ok"}`

2. **Verifique a porta:**
   - O backend pode estar em outra porta
   - Verifique no EasyPanel qual porta está configurada

3. **Se estiver em outro servidor:**
   - Use o IP ou domínio correto
   - Ex: `http://IP_DO_SERVIDOR:3000/api/webhooks/n8n/1`

---

## 📝 RESUMO

1. **URL deve ter tenantId:** `/api/webhooks/n8n/1` (não `/api/webhooks/n8n/`)
2. **Use fallback:** `{{ $json.tenantId || 1 }}`
3. **Teste com hardcode primeiro:** `http://localhost:3000/api/webhooks/n8n/1`
4. **Verifique se backend está rodando:** `http://localhost:3000/api/health`

**Me avise qual URL funcionou!**

