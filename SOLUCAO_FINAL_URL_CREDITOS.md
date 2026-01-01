# ✅ SOLUÇÃO FINAL: URL Corrigida

## 🐛 PROBLEMA

A URL está sendo chamada como:
- ❌ `POST /api/webhooks/n8n/` (sem tenantId)
- ✅ Deveria ser: `POST /api/webhooks/n8n/1` (com tenantId)

## ✅ SOLUÇÃO: URL com TenantId Garantido

### No HTTP Request do N8N, configure assim:

**URL (use uma destas opções):**

#### Opção 1: Hardcode Temporário (PARA TESTAR AGORA)

```
http://localhost:3000/api/webhooks/n8n/1
```

**(Substitua `1` pelo ID do seu tenant - ex: 39 baseado no erro anterior)**

#### Opção 2: Com Expressão e Fallback

```
http://localhost:3000/api/webhooks/n8n/{{ $json.tenantId || $('Edit Fields2').item.json.tenantId || 39 }}
```

#### Opção 3: Extrair do Webhook URL

```
http://localhost:3000/api/webhooks/n8n/{{ parseInt($('Webhook').item.json.webhookUrl.split('/').pop().replace(/tenant[_\s]*/i, '')) || 39 }}
```

**IMPORTANTE:** Sempre tenha um fallback numérico (|| 39) para garantir que a URL seja válida.

---

## 🔧 CONFIGURAÇÃO COMPLETA

### HTTP Request:

**Method:** POST

**URL:** 
```
http://localhost:3000/api/webhooks/n8n/39
```
*(Use o ID do seu tenant - parece ser 39 baseado no erro anterior)*

**Authentication:** None

**Body (JSON):**
```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData || [] }}",
  "timestamp": "={{ $json.timestamp || $now.toISO() }}"
}
```

**Options:**
- **Continue On Fail:** ✅ TRUE

---

## 🧪 TESTE PASSO A PASSO

### 1. Teste com URL Hardcoded Primeiro

1. No HTTP Request, use:
   ```
   http://localhost:3000/api/webhooks/n8n/39
   ```
   *(Substitua 39 pelo ID do seu tenant)*

2. **Body:**
   ```json
   {
     "eventType": "usage_tracking_batch",
     "data": "=[]",
     "timestamp": "={{ $now.toISO() }}"
   }
   ```

3. **Execute** o workflow

4. **Verifique** se retorna 200 (sucesso)

### 2. Se Funcionar, Trocar por Expressão Dinâmica

Depois que funcionar com hardcode, troque a URL por:

```
http://localhost:3000/api/webhooks/n8n/{{ $json.tenantId || $('Edit Fields2').item.json.tenantId || 39 }}
```

---

## 🔍 VERIFICAR SE BACKEND ESTÁ RODANDO

Teste no navegador ou Postman:

```
http://localhost:3000/api/health
```

**Deve retornar:** `{"status":"ok"}`

**Se não funcionar:**
- Backend pode estar em outra porta
- Backend pode estar em outro servidor
- Verifique no EasyPanel qual porta está configurada

---

## 📝 IMPORTANTE: URL DEVE TER TENANTID

A rota espera: `/api/webhooks/n8n/:tenantId`

**NUNCA deixe a URL sem o tenantId:**
- ❌ `http://localhost:3000/api/webhooks/n8n/` (ERRADO)
- ✅ `http://localhost:3000/api/webhooks/n8n/39` (CORRETO)

---

## 🆘 SE AINDA DER 404

### Verificar:

1. **Backend está rodando?**
   - Teste: `http://localhost:3000/api/health`

2. **Porta correta?**
   - Verifique no EasyPanel qual porta está configurada
   - Pode ser 3000, 3001, 8080, etc.

3. **Mesmo servidor?**
   - Se N8N e backend estão em servidores diferentes
   - Use IP ou domínio: `http://IP:PORTA/api/webhooks/n8n/39`

4. **Rota existe?**
   - A rota está em: `server/_core/index.ts` linha 39
   - Deve ser: `app.post("/api/webhooks/n8n/:tenantId", ...)`

---

## ✅ RESUMO RÁPIDO

1. **Use URL hardcoded primeiro:** `http://localhost:3000/api/webhooks/n8n/39`
2. **Substitua 39 pelo ID do seu tenant**
3. **Teste se funciona**
4. **Se funcionar, troque por expressão dinâmica**

**Me avise se funcionou com a URL hardcoded!**

