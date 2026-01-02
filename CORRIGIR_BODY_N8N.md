# ✅ Corrigir Body do HTTP Request no N8N

## 🐛 PROBLEMA

O body está chegando com expressões do N8N não resolvidas:
```json
{
  "eventType": "usage_tracking_batch",
  "data": "=[]",  // ❌ Deveria ser: []
  "timestamp": "=2026-01-02T08:39:26.672-05:00"  // ❌ Deveria ser: "2026-01-02..."
}
```

## ✅ SOLUÇÃO

### No HTTP Request do N8N:

**IMPORTANTE:** Use **"JSON"** como formato do body, NÃO "Raw" ou "Form-Data".

### Configuração Correta:

1. **Method:** POST

2. **URL:** 
   ```
   http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json.tenantId || 39 }}
   ```
   (Use a URL do backend, não do N8N)

3. **Body Content Type:** `JSON`

4. **Body (JSON):**
   ```json
   {
     "eventType": "usage_tracking_batch",
     "data": {{ $json.allUsageData || [] }},
     "timestamp": {{ $now.toISO() }}
   }
   ```

   **OU se usar expressões:**
   ```json
   {
     "eventType": "usage_tracking_batch",
     "data": "={{ $json.allUsageData || [] }}",
     "timestamp": "={{ $now.toISO() }}"
   }
   ```

   **⚠️ IMPORTANTE:** 
   - Se usar `"={{ ... }}"`, o N8N vai avaliar a expressão
   - Se usar `{{ ... }}` (sem aspas), o N8N também vai avaliar
   - **NÃO use** `"=[]"` como string literal

---

## 🔧 CONFIGURAÇÃO PASSO A PASSO

### Opção 1: Usar Expressões com Aspas (RECOMENDADO)

1. No HTTP Request, vá em **"Body"**
2. Selecione **"JSON"**
3. Cole:
   ```json
   {
     "eventType": "usage_tracking_batch",
     "data": "={{ $json.allUsageData || [] }}",
     "timestamp": "={{ $now.toISO() }}"
   }
   ```

4. O N8N vai avaliar as expressões automaticamente

---

### Opção 2: Usar Expressões sem Aspas (Alternativa)

1. No HTTP Request, vá em **"Body"**
2. Selecione **"JSON"**
3. Cole:
   ```json
   {
     "eventType": "usage_tracking_batch",
     "data": {{ $json.allUsageData || [] }},
     "timestamp": "{{ $now.toISO() }}"
   }
   ```

   **⚠️ CUIDADO:** Se `allUsageData` for um array vazio, pode dar erro de sintaxe JSON.

---

### Opção 3: Usar "Specify Body" (Mais Seguro)

1. No HTTP Request, vá em **"Body"**
2. Selecione **"Specify Body"**
3. Clique em **"Add Field"**
4. Adicione:
   - **Name:** `eventType`
   - **Value:** `usage_tracking_batch`
5. Adicione:
   - **Name:** `data`
   - **Value:** `={{ $json.allUsageData || [] }}`
6. Adicione:
   - **Name:** `timestamp`
   - **Value:** `={{ $now.toISO() }}`

---

## 🧪 TESTE

Após configurar, execute o workflow e verifique os logs do backend:

**Se estiver correto, você verá:**
```
[N8N Webhook] 📦 Body: {
  "eventType": "usage_tracking_batch",
  "data": [],
  "timestamp": "2026-01-02T08:39:26.672-05:00"
}
```

**Se ainda estiver com "=", você verá:**
```
[N8N Webhook] 📦 Body: {
  "eventType": "usage_tracking_batch",
  "data": "=[]",
  "timestamp": "=2026-01-02..."
}
```

**Nesse caso, o backend vai tentar limpar automaticamente, mas é melhor corrigir no N8N.**

---

## ✅ RESUMO

1. **Use "JSON" como formato do body**
2. **Use expressões com `={{ ... }}` ou `{{ ... }}`**
3. **NÃO use strings literais como `"=[]"`**
4. **Teste e verifique os logs**

**O backend agora tem tratamento para limpar essas expressões automaticamente, mas é melhor configurar corretamente no N8N!**

