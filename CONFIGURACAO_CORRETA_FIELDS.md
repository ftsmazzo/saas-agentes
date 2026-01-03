# ✅ Configuração CORRETA: HTTP Request usando "Using Fields"

## 🐛 PROBLEMA ATUAL

Você está criando campos individuais:
- `operations`
- `model`
- `ImputTokens`
- etc.

Mas o backend espera um campo `data` com um **array JSON**.

---

## ✅ SOLUÇÃO CORRETA

### PASSO 1: No HTTP Request

1. **Body Content Type:** `JSON`
2. **Specify Body:** `Using Fields`
3. **Delete TODOS os campos que você criou** (operations, model, ImputTokens, etc.)

### PASSO 2: Criar APENAS 3 campos

**Campo 1:**
- **Name:** `eventType`
- **Type:** `String`
- **Value:** `usage_tracking_batch` (SEM `={{ }}`)

**Campo 2:**
- **Name:** `data`
- **Type:** `String` ← **IMPORTANTE: String, não Array!**
- **Value:** `={{ JSON.stringify($json._credits.allUsageData) }}` ← **USE ESTA EXPRESSÃO**

**Campo 3:**
- **Name:** `timestamp`
- **Type:** `String`
- **Value:** `={{ $json._credits.timestamp }}`

---

## ⚠️ IMPORTANTE

- **NÃO crie campos individuais** (operations, model, tokens, etc.)
- **Crie APENAS o campo `data`** com a expressão `JSON.stringify`
- O campo `data` deve ser **Type: String** (não Array!)
- O valor do campo `data` deve ser a expressão que converte o array para JSON string

---

## 🧪 TESTE

1. **Delete todos os campos antigos**
2. **Crie apenas os 3 campos acima**
3. **Execute o workflow**
4. **Verifique o output do HTTP Request:**
   - Deve ter `"data": "[{...}]"` (string JSON)
   - Não deve ter campos individuais

---

## 📝 RESUMO

- **3 campos apenas:** `eventType`, `data`, `timestamp`
- **Campo `data`:** Type = String, Value = `={{ JSON.stringify($json._credits.allUsageData) }}`
- **NÃO crie campos individuais** - o backend espera um array no campo `data`

