# ✅ Correção: HTTP Request - Enviar Array Corretamente

## 🐛 PROBLEMA

O N8N está convertendo o array para string `"[object Object]"`:

```json
{
  "eventType": "usage_tracking_batch",
  "data": "=[object Object]",  // ❌ ERRADO - está como string
  "timestamp": "=2026-01-02T15:27:06.121Z"
}
```

## ✅ SOLUÇÃO

**O problema é usar aspas no campo `data`. Precisa enviar o array diretamente, sem aspas.**

---

## 🔧 CONFIGURAÇÃO CORRETA DO HTTP REQUEST

### Opção 1: Usar "Specify Body" → "Using JSON" (RECOMENDADO)

**No HTTP Request:**

1. **Body Content Type:** `JSON`
2. **Specify Body:** `Using JSON`
3. **Cole este JSON (SEM ASPAS no data):**

```json
{
  "eventType": "usage_tracking_batch",
  "data": {{ $json._credits.allUsageData }},
  "timestamp": "{{ $json._credits.timestamp }}"
}
```

**IMPORTANTE:**
- `data` **NÃO tem aspas** - é `{{ $json._credits.allUsageData }}` direto
- `timestamp` **TEM aspas** - é string
- O N8N vai converter `{{ ... }}` para JSON automaticamente

---

### Opção 2: Usar "Specify Body" → "Using Fields"

**Se a Opção 1 não funcionar, configure campo por campo:**

1. **Body Content Type:** `JSON`
2. **Specify Body:** `Using Fields`
3. **Adicione 3 campos:**

**Campo 1:**
- **Name:** `eventType`
- **Type:** `String`
- **Value:** `usage_tracking_batch`

**Campo 2:**
- **Name:** `data`
- **Type:** `Array` (ou `Object` se não tiver Array)
- **Value:** `={{ $json._credits.allUsageData }}`
- **IMPORTANTE:** Não coloque aspas aqui!

**Campo 3:**
- **Name:** `timestamp`
- **Type:** `String`
- **Value:** `={{ $json._credits.timestamp }}`

---

### Opção 3: Usar JSON.stringify (Se ainda não funcionar)

**No HTTP Request, use "Specify Body" → "Using JSON":**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ JSON.stringify($json._credits.allUsageData) }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**O backend já trata strings que começam com "=" e faz JSON.parse, então vai funcionar.**

---

## 🔧 ALTERNATIVA: Modificar Code para Retornar String JSON

**Se NADA funcionar, modifique o Code node para retornar string JSON:**

**No final do Code node, antes do return, adicione:**

```javascript
// ... (código existente) ...

// Converter allUsageData para string JSON
const allUsageDataJson = JSON.stringify(allUsageData);

return {
  json: {
    ...inputData,
    _credits: {
      tenantId: tenantId,
      allUsageData: allUsageData, // Array original
      allUsageDataJson: allUsageDataJson, // String JSON
      timestamp: new Date().toISOString(),
      totalItems: allUsageData.length
    }
  }
};
```

**E no HTTP Request, use:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageDataJson }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**O backend vai fazer JSON.parse automaticamente.**

---

## 🧪 TESTE PASSO A PASSO

### 1. Teste Opção 1 Primeiro

1. **No HTTP Request**, configure:
   - Body Content Type: `JSON`
   - Specify Body: `Using JSON`
   - Cole o JSON sem aspas no `data`

2. **Execute** o workflow

3. **Veja o Result** do HTTP Request

4. **Se aparecer `[object Object]`**, tente Opção 2

### 2. Se Opção 1 Não Funcionar

1. **Use Opção 2** (campos individuais)
2. **Ou Opção 3** (JSON.stringify)
3. **Ou modifique o Code** para retornar string JSON

---

## 📋 VERIFICAÇÃO

**O Result do HTTP Request deve mostrar:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": [
    {
      "operation": "chat",
      "model": "gpt-4.1-mini",
      "tokensInput": 1875,
      "tokensOutput": 1530,
      "totalTokens": 3405
    }
  ],
  "timestamp": "2026-01-02T15:27:06.121Z"
}
```

**NÃO deve aparecer:**
- ❌ `"data": "=[object Object]"`
- ❌ `"data": "[object Object]"`

**Deve aparecer:**
- ✅ `"data": [...]` (array de objetos)

---

## ✅ RESUMO

**Problema:** N8N converte array para string quando usa aspas

**Solução:**
1. ✅ **Opção 1:** `data: {{ $json._credits.allUsageData }}` (sem aspas)
2. ✅ **Opção 2:** Campos individuais sem aspas
3. ✅ **Opção 3:** JSON.stringify no Code ou HTTP Request
4. ✅ **Opção 4:** Modificar Code para retornar string JSON

**Teste a Opção 1 primeiro!**

