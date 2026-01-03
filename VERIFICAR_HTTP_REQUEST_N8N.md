# 🔍 Como Verificar se o HTTP Request está Configurado Corretamente

## 🐛 PROBLEMA

O output do N8N mostra:
```json
{
  "data": "=[{...}]"  // ✅ CORRETO - JSON string
}
```

Mas o backend recebe:
```json
{
  "data": "operation:chat, gpt-4.1-mini, 1876"  // ❌ ERRADO - string literal
}
```

Isso significa que o **HTTP Request não está usando o output correto**.

---

## ✅ SOLUÇÃO: Verificar Configuração do HTTP Request

### PASSO 1: Verificar o Input do HTTP Request

1. **Execute o workflow** no N8N
2. **Clique no Code node** (antes do HTTP Request)
3. **Verifique o output:**
   - Deve ter `_credits.allUsageData` como **array**
   - Deve ter `_credits.allUsageDataJson` como **string JSON**

### PASSO 2: Verificar o HTTP Request Body

1. **Abra o HTTP Request node**
2. **Vá em "Specify Body" → "Using JSON"**
3. **Verifique se está EXATAMENTE assim:**

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ JSON.stringify($json._credits.allUsageData) }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

**⚠️ IMPORTANTE:**
- Deve usar `$json._credits.allUsageData` (não `allUsageData[0]`)
- Deve usar `JSON.stringify` para converter o array
- As expressões `={{ ... }}` devem estar **DENTRO das aspas**

### PASSO 3: Verificar o Output do HTTP Request

1. **Execute o workflow**
2. **Clique no HTTP Request node** para ver o output
3. **Verifique o campo `data`:**

✅ **CORRETO:**
```json
{
  "data": "[{\"operation\":\"chat\",\"model\":\"gpt-4.1-mini\",...}]"
}
```

❌ **ERRADO:**
```json
{
  "data": "operation:chat, gpt-4.1-mini, 1876"
}
```

---

## 🔧 SE ESTÁ ERRADO

### Opção 1: Usar "Using Fields" em vez de "Using JSON"

1. **No HTTP Request:**
   - **Body Content Type:** `JSON`
   - **Specify Body:** `Using Fields` (NÃO "Using JSON")

2. **Adicione 3 campos:**

**Campo 1:**
- **Name:** `eventType`
- **Type:** `String`
- **Value:** `usage_tracking_batch`

**Campo 2:**
- **Name:** `data`
- **Type:** `String` ← **IMPORTANTE: String!**
- **Value:** `={{ JSON.stringify($json._credits.allUsageData) }}`

**Campo 3:**
- **Name:** `timestamp`
- **Type:** `String`
- **Value:** `={{ $json._credits.timestamp }}`

### Opção 2: Usar allUsageDataJson do Code node

Se o Code node já cria `allUsageDataJson`, use ele:

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json._credits.allUsageDataJson }}",
  "timestamp": "={{ $json._credits.timestamp }}"
}
```

---

## 🧪 TESTE

1. **Execute o workflow**
2. **Veja o output do HTTP Request**
3. **O campo `data` deve ser uma string JSON válida**
4. **Verifique os logs do backend** - deve mostrar `✅ Data parseado com sucesso`

---

## 📝 RESUMO

- **Verifique o input do HTTP Request** (output do Code node)
- **Use `JSON.stringify`** para converter o array
- **Verifique o output do HTTP Request** para confirmar
- **Se ainda não funcionar**, use "Using Fields" em vez de "Using JSON"

