# 🔍 Diagnóstico: N8N 404 - Requisição Não Chega ao Servidor

## 🐛 PROBLEMA IDENTIFICADO

Os logs mostram:
- ✅ Health check funciona: `GET /api/health` → 200 OK
- ❌ N8N webhook não aparece nos logs: `POST /api/webhooks/n8n/:tenantId` → NUNCA CHEGA

**Isso significa que a requisição do N8N NÃO está chegando ao servidor.**

---

## 🔍 DIAGNÓSTICO PASSO A PASSO

### 1. Verificar URL no N8N

No N8N, abra o **HTTP Request** node e verifique:

**URL atual:**
```
❓ Qual URL está configurada?
```

**Possíveis problemas:**
- URL com `localhost` (não funciona se N8N e backend estão em containers diferentes)
- URL com IP externo errado
- URL sem `tenantId`
- URL com porta errada

---

### 2. Descobrir Nome do Serviço Backend no EasyPanel

1. No EasyPanel, vá para o **projeto** onde está o backend
2. Veja o **nome do serviço** do backend (ex: `saas-agentes`, `saas_agentes`, `backend`)
3. Anote o nome exato

**Exemplo:**
- Se o serviço se chama `saas-agentes` → use `http://saas-agentes:3000`
- Se o serviço se chama `saas_agentes` → use `http://saas_agentes:3000`

---

### 3. Verificar Domínio do Backend

1. No EasyPanel, vá para o serviço do backend
2. Vá em **"Domains"** ou **"Networking"**
3. Veja se há um domínio configurado (ex: `https://saas-agentes.xxx.easypanel.host`)

**Se tiver domínio:**
- Use: `https://DOMINIO_BACKEND/api/webhooks/n8n/39`
- **NÃO precisa da porta** (usa 80/443 automaticamente)

**Se NÃO tiver domínio:**
- Use: `http://NOME_SERVICO:3000/api/webhooks/n8n/39`
- **Precisa da porta** (geralmente 3000)

---

### 4. Testar Endpoint de Teste

Adicionei um endpoint de teste que aceita **qualquer método**:

**No N8N, teste primeiro com:**
```
http://NOME_SERVICO:3000/api/webhooks/n8n/test
```

**OU se tiver domínio:**
```
https://DOMINIO_BACKEND/api/webhooks/n8n/test
```

**Configuração no HTTP Request:**
- **Method:** GET (ou POST)
- **URL:** `http://NOME_SERVICO:3000/api/webhooks/n8n/test`
- **Body:** (vazio ou qualquer coisa)

**Se funcionar, você verá nos logs:**
```
[ALL REQUESTS] 🔍 GET /api/webhooks/n8n/test
[N8N Test] 🧪 TESTE RECEBIDO: GET /api/webhooks/n8n/test
```

**Se NÃO funcionar:**
- URL está errada
- Nome do serviço está errado
- Porta está errada
- Backend não está acessível do N8N

---

## ✅ SOLUÇÕES

### Solução 1: URL Interna (RECOMENDADO)

Se N8N e backend estão no **mesmo EasyPanel**:

**No HTTP Request do N8N:**
```
http://NOME_SERVICO:3000/api/webhooks/n8n/{{ $json.tenantId || 39 }}
```

**Substitua `NOME_SERVICO` pelo nome real do serviço no EasyPanel.**

**Exemplos:**
- `http://saas-agentes:3000/api/webhooks/n8n/39`
- `http://saas_agentes:3000/api/webhooks/n8n/39`
- `http://backend:3000/api/webhooks/n8n/39`

---

### Solução 2: URL Externa (Se tiver domínio)

Se o backend tem um domínio configurado:

**No HTTP Request do N8N:**
```
https://DOMINIO_BACKEND/api/webhooks/n8n/{{ $json.tenantId || 39 }}
```

**Exemplos:**
- `https://saas-agentes.xxx.easypanel.host/api/webhooks/n8n/39`
- `https://backend.xxx.easypanel.host/api/webhooks/n8n/39`

**⚠️ IMPORTANTE:** Use `https://` (não `http://`) se o domínio tiver SSL.

---

### Solução 3: IP Externo (ÚLTIMA OPÇÃO)

Se nada funcionar, use o IP externo do servidor:

**No HTTP Request do N8N:**
```
http://IP_EXTERNO:3000/api/webhooks/n8n/{{ $json.tenantId || 39 }}
```

**⚠️ CUIDADO:** 
- IP pode mudar
- Pode não funcionar se houver firewall
- Menos seguro

---

## 🧪 TESTE PASSO A PASSO

### Passo 1: Testar Endpoint de Teste

1. No N8N, crie um workflow simples
2. Adicione um **HTTP Request** node
3. Configure:
   - **Method:** GET
   - **URL:** `http://NOME_SERVICO:3000/api/webhooks/n8n/test`
   - (Substitua `NOME_SERVICO` pelo nome real)
4. Execute o workflow
5. Verifique os logs do backend

**Se aparecer nos logs:**
```
[N8N Test] 🧪 TESTE RECEBIDO
```
✅ **Funcionou!** A URL está correta.

**Se NÃO aparecer:**
❌ URL está errada ou backend não está acessível.

---

### Passo 2: Testar Webhook Real

Depois que o teste funcionar:

1. No HTTP Request, mude a URL para:
   ```
   http://NOME_SERVICO:3000/api/webhooks/n8n/39
   ```
   (Substitua `39` pelo ID do seu tenant)

2. Configure:
   - **Method:** POST
   - **Body (JSON):**
     ```json
     {
       "eventType": "usage_tracking",
       "data": {
         "operation": "chat",
         "model": "gpt-4o-mini",
         "tokensInput": 100,
         "tokensOutput": 50
       }
     }
     ```

3. Execute o workflow
4. Verifique os logs do backend

**Se aparecer nos logs:**
```
[ALL REQUESTS] 🔍 POST /api/webhooks/n8n/39
[N8N Route] 🎯 ROTA CHAMADA: POST /api/webhooks/n8n/39
[N8N Webhook] 🎯 HANDLER CHAMADO: POST /api/webhooks/n8n/39
```
✅ **Funcionou!**

---

## 📋 CHECKLIST

- [ ] Identifiquei o nome do serviço do backend no EasyPanel
- [ ] Testei o endpoint `/api/webhooks/n8n/test` e funcionou
- [ ] Configurei a URL correta no HTTP Request do N8N
- [ ] Testei o webhook real e funcionou
- [ ] Verifiquei os logs do backend confirmando recebimento

---

## 🆘 SE AINDA NÃO FUNCIONAR

### Verificar:

1. **Backend está rodando?**
   - Teste: `GET /api/health` deve retornar 200

2. **Mesma rede Docker?**
   - N8N e backend devem estar no mesmo projeto EasyPanel
   - Ou na mesma rede Docker

3. **Porta correta?**
   - Verifique nos logs do backend: `Server running on http://localhost:PORTA/`
   - Use essa porta na URL

4. **Firewall/Proxy?**
   - EasyPanel pode ter proxy reverso
   - Tente usar domínio ao invés de IP/porta

---

## 📝 INFORMAÇÕES NECESSÁRIAS

Para eu ajudar melhor, preciso saber:

1. **Nome do serviço do backend no EasyPanel:** `?`
2. **Domínio do backend (se tiver):** `?`
3. **URL atual configurada no N8N:** `?`
4. **Porta do backend (dos logs):** `?`
5. **N8N e backend estão no mesmo projeto EasyPanel?** `SIM / NÃO`

---

## ✅ RESUMO

1. **Teste primeiro:** `http://NOME_SERVICO:3000/api/webhooks/n8n/test`
2. **Se funcionar:** Use a mesma URL base para o webhook real
3. **Sempre inclua:** `tenantId` na URL (ex: `/api/webhooks/n8n/39`)
4. **Verifique logs:** Se não aparecer `[ALL REQUESTS]`, a requisição não está chegando

**Me envie essas informações e eu te ajudo a configurar a URL correta!**

