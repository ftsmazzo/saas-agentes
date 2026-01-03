# ✅ INSTRUÇÕES CORRETAS: HTTP Request no N8N

## 🐛 PROBLEMA ATUAL

Você está enviando uma **STRING LITERAL** em vez de processar a expressão:

```json
{
  "data": "operation:{{ $json._credits.allUsageData[0].operation }}, ..."
}
```

Isso **NÃO FUNCIONA** porque o N8N não processa as expressões `{{ }}` quando estão dentro de uma string literal.

---

## ✅ SOLUÇÃO CORRETA

### PASSO 1: Abra o HTTP Request node

### PASSO 2: Configure assim:

1. **Method:** `POST`
2. **URL:** `http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json._credits.tenantId }}`
3. **Body Content Type:** `JSON`

### PASSO 3: Body Configuration

**Opção A - "Using JSON" (RECOMENDADO):**

1. Clique em **"Specify Body"**
2. Selecione **"Using JSON"**
3. **Cole EXATAMENTE isto:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ JSON.stringify($json._credits.allUsageData) }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**⚠️ IMPORTANTE:**
- As expressões `={{ ... }}` devem estar **DENTRO das aspas**
- O N8N vai **PROCESSAR** a expressão e substituir pelo valor
- `JSON.stringify` converte o array para string JSON

---

**Opção B - "Using Fields" (Se Opção A não funcionar):**

1. Clique em **"Specify Body"**
2. Selecione **"Using Fields"**
3. Clique em **"Add Field"** 3 vezes

**Campo 1:**
- **Name:** `eventType`
- **Type:** `String`
- **Value:** `usage_tracking_batch` (SEM `={{ }}`)

**Campo 2:**
- **Name:** `data`
- **Type:** `String` ← **IMPORTANTE: String, não Array!**
- **Value:** `={{ JSON.stringify($json._credits.allUsageData) }}`

**Campo 3:**
- **Name:** `timestamp`
- **Type:** `String`
- **Value:** `={{ $json._credits.timestamp }}`

---

## 🧪 COMO VERIFICAR SE ESTÁ CORRETO

1. **Execute o workflow** no N8N
2. **Clique no HTTP Request node** para ver o output
3. **Verifique o campo `data`:**

✅ **CORRETO:**
```json
{
  "data": "[{\"operation\":\"chat\",\"model\":\"gpt-4.1-mini\",...}]"
}
```

❌ **ERRADO (string literal não processada):**
```json
{
  "data": "operation:{{ $json._credits.allUsageData[0].operation }}, ..."
}
```

❌ **ERRADO (objeto não serializado):**
```json
{
  "data": "[object Object]"
}
```

---

## 🔍 DEBUG

Se ainda não funcionar:

1. **Verifique o output do Code node:**
   - Deve ter `_credits.allUsageData` como array
   - Deve ter `_credits.allUsageDataJson` como string JSON

2. **Verifique o output do HTTP Request:**
   - O campo `data` deve ser uma **string JSON válida**
   - Deve começar com `"[{` e terminar com `}]"`

3. **Verifique os logs do backend:**
   - Deve mostrar `✅ Data parseado com sucesso`
   - Não deve mostrar `❌ ERRO ao parsear data`

---

## ✅ RESUMO

- **NÃO use string literal** como `"operation:{{ ... }}"`
- **USE expressões processadas** como `"={{ JSON.stringify(...) }}"`
- **Verifique o output** do HTTP Request para confirmar que processou
- **O campo `data` deve ser string JSON**, não objeto ou string literal

