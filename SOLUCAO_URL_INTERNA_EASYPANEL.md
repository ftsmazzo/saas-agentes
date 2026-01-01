# ✅ SOLUÇÃO: URL Interna do EasyPanel

## 🔍 PROBLEMA IDENTIFICADO

O N8N está tentando chamar o backend usando um **IP externo**:
```
http://195.201.150.56:3000/api/webhooks/n8n/39
```

Mas se ambos os serviços estão no **EasyPanel**, eles podem se comunicar via **rede interna** usando o **nome do serviço**.

---

## ✅ SOLUÇÃO: Usar Nome do Serviço Interno

### No HTTP Request do N8N, use uma destas opções:

#### Opção 1: Nome do Serviço Interno (RECOMENDADO)

Se o serviço do backend se chama `saas_agentes` no EasyPanel:

```
http://saas_agentes:3000/api/webhooks/n8n/{{ $('Edit Fields2').item.json.tenantId || 39 }}
```

**OU** (se o nome tiver hífen):

```
http://saas-agentes:3000/api/webhooks/n8n/{{ $('Edit Fields2').item.json.tenantId || 39 }}
```

#### Opção 2: URL Externa do Backend (se tiver domínio)

Se o backend tem um domínio no EasyPanel (ex: `https://saas-agentes.xxx.easypanel.host/`):

```
https://saas-agentes.xxx.easypanel.host/api/webhooks/n8n/{{ $('Edit Fields2').item.json.tenantId || 39 }}
```

**Substitua `xxx` pelo seu domínio real do backend.**

#### Opção 3: IP Interno do Docker Network

Se os serviços estão na mesma rede Docker:

```
http://saas_agentes:3000/api/webhooks/n8n/{{ $('Edit Fields2').item.json.tenantId || 39 }}
```

---

## 🔍 COMO DESCOBRIR O NOME DO SERVIÇO

### No EasyPanel:

1. Vá para o serviço do **backend** (não o N8N)
2. Procure por **"Domínios"** ou **"Networking"**
3. O nome do serviço geralmente é:
   - O nome que aparece na lista de serviços
   - Pode ter hífen (`saas-agentes`) ou underscore (`saas_agentes`)
   - Pode estar em minúsculas

### Exemplo:

Se na lista de serviços você vê:
- `saas_agentes` → use `http://saas_agentes:3000`
- `saas-agentes` → use `http://saas-agentes:3000`

---

## 📝 CONFIGURAÇÃO NO HTTP REQUEST DO N8N

### URL (use uma das opções acima):

**Recomendado (rede interna):**
```
http://saas_agentes:3000/api/webhooks/n8n/{{ $('Edit Fields2').item.json.tenantId || 39 }}
```

**Ou se tiver domínio externo:**
```
https://saas-agentes.xxx.easypanel.host/api/webhooks/n8n/{{ $('Edit Fields2').item.json.tenantId || 39 }}
```

### Body (JSON):

```json
{
  "eventType": "usage_tracking_batch",
  "data": "={{ $json.allUsageData || [] }}",
  "timestamp": "={{ $now.toISO() }}"
}
```

### Options:
- **Continue On Fail:** ✅ TRUE

---

## 🧪 TESTE PASSO A PASSO

### 1. Descobrir o Nome do Serviço

1. No EasyPanel, vá para o serviço do **backend** (não N8N)
2. Anote o nome exato do serviço
3. Verifique se há um domínio configurado

### 2. Testar com URL Interna

1. No N8N, abra o HTTP Request node
2. Use a URL com o nome do serviço:
   ```
   http://NOME_DO_SERVICO:3000/api/webhooks/n8n/39
   ```
3. Execute o workflow
4. Verifique se funciona

### 3. Se Não Funcionar

Se a URL interna não funcionar, tente:

1. **URL Externa do Backend:**
   - Vá em "Domínios" do serviço backend
   - Use o domínio completo:
   ```
   https://DOMINIO_BACKEND/api/webhooks/n8n/39
   ```

2. **Verificar Porta:**
   - A porta pode não ser 3000
   - Verifique nos logs do backend qual porta está sendo usada
   - Ou use a porta padrão do EasyPanel (geralmente 80 ou 443 para HTTPS)

---

## ⚠️ IMPORTANTE

### Rede Interna vs Externa:

- **Rede Interna:** `http://nome-servico:porta` (mais rápido, não passa pela internet)
- **Rede Externa:** `https://dominio.com` (passa pela internet, pode ter latência)

### Porta:

- Se usar rede interna, geralmente precisa especificar a porta (ex: `:3000`)
- Se usar domínio externo, geralmente não precisa da porta (usa 80/443)

---

## 🔍 VERIFICAR SE FUNCIONOU

Após configurar, execute o workflow e verifique:

1. **No N8N:** O HTTP Request deve retornar status 200
2. **No Backend (logs):** Deve aparecer:
   ```
   [Debug] 🔍 Requisição recebida: POST /api/webhooks/n8n/39
   [N8N Webhook] 📥 Recebido: POST /api/webhooks/n8n/39
   [N8N Webhook] ✅ tenantId válido: 39
   ```

Se aparecer `404`, verifique:
- Nome do serviço está correto?
- Porta está correta?
- Backend está rodando?

---

## 📋 CHECKLIST

- [ ] Identifiquei o nome do serviço do backend no EasyPanel
- [ ] Configurei a URL no HTTP Request usando o nome do serviço
- [ ] Testei e funcionou (status 200)
- [ ] Verifiquei os logs do backend confirmando recebimento

**Me avise qual é o nome do serviço do backend no EasyPanel e eu te ajudo a configurar a URL correta!**

