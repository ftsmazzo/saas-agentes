# 🌐 Deploy com Cloudflare Tunnel (MAIS SIMPLES)

Este é o método **mais simples e rápido** para colocar sua aplicação online. Funciona perfeitamente para testes, MVP e até produção pequena/média.

---

## ✅ Pré-requisitos

- [ ] Domínio configurado no Cloudflare (gratuito)
- [ ] Servidor rodando localmente ou em VPS
- [ ] Acesso ao painel do Cloudflare

---

## 🚀 PASSO 1: Instalar Cloudflare Tunnel

### Windows (seu caso):

1. Baixe o `cloudflared`:
   - Acesse: https://github.com/cloudflare/cloudflared/releases
   - Baixe: `cloudflared-windows-amd64.exe`
   - Renomeie para: `cloudflared.exe`
   - Coloque em uma pasta (ex: `C:\cloudflared\`)

2. Adicione ao PATH (opcional):
   - Adicione a pasta ao PATH do Windows
   - Ou use o caminho completo ao executar

### Linux (se tiver VPS):

```bash
# Instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

---

## 🔐 PASSO 2: Autenticar no Cloudflare

1. Abra o terminal/PowerShell
2. Execute:

```powershell
# Windows
C:\caminho\para\cloudflared.exe login

# Ou se estiver no PATH
cloudflared login
```

3. Isso abrirá o navegador
4. Faça login no Cloudflare
5. Autorize o acesso
6. Pronto! Autenticado.

---

## 🏗️ PASSO 3: Criar Tunnel

### 3.1. Criar Tunnel no Cloudflare Dashboard

1. Acesse: https://one.dash.cloudflare.com/
2. Vá em **"Zero Trust"** → **"Networks"** → **"Tunnels"**
3. Clique em **"Create a tunnel"**
4. Escolha **"Cloudflared"**
5. Nome: `saas-agentes`
6. Clique em **"Save tunnel"**

### 3.2. Instalar Token no Servidor

1. Após criar, você verá um comando para instalar
2. Copie o comando (algo como):
   ```
   cloudflared service install <token>
   ```
3. Execute no servidor onde sua aplicação roda

**OU** use o método manual abaixo.

---

## ⚙️ PASSO 4: Configurar Tunnel Manualmente

### 4.1. Criar Arquivo de Configuração

Crie arquivo: `C:\Users\gesta\.cloudflared\config.yml`

```yaml
tunnel: <seu-tunnel-id>
credentials-file: C:\Users\gesta\.cloudflared\<tunnel-id>.json

ingress:
  # Webhook Stripe (importante vir primeiro)
  - hostname: fabricadosdados.com.br
    path: /api/webhooks/stripe
    service: http://localhost:3000
  
  # API tRPC
  - hostname: fabricadosdados.com.br
    path: /api/trpc
    service: http://localhost:3000
  
  # API OAuth
  - hostname: fabricadosdados.com.br
    path: /api/oauth
    service: http://localhost:3000
  
  # Tudo mais (aplicação)
  - hostname: fabricadosdados.com.br
    service: http://localhost:3000
  
  # Catch-all (404)
  - service: http_status:404
```

### 4.2. Obter Tunnel ID e Credentials

1. No Cloudflare Dashboard → Tunnels
2. Clique no tunnel criado
3. Na aba **"Configure"**, você verá:
   - **Tunnel ID**: Copie
   - **Credentials**: Baixe o arquivo JSON

4. Coloque o arquivo JSON em: `C:\Users\gesta\.cloudflared\<tunnel-id>.json`

### 4.3. Atualizar config.yml

Substitua `<seu-tunnel-id>` pelo ID real do tunnel.

---

## 🚀 PASSO 5: Iniciar Tunnel

### 5.1. Iniciar Manualmente (Teste)

```powershell
# Windows
C:\caminho\para\cloudflared.exe tunnel run

# Ou se estiver no PATH
cloudflared tunnel run
```

### 5.2. Iniciar como Serviço (Produção)

```powershell
# Instalar como serviço Windows
cloudflared service install

# Iniciar serviço
net start cloudflared

# Ver status
sc query cloudflared
```

**OU** use o comando do Cloudflare Dashboard (mais fácil).

---

## 🌐 PASSO 6: Configurar DNS no Cloudflare

1. No Cloudflare Dashboard, vá em **"DNS"**
2. Adicione registro:
   - **Type**: `CNAME`
   - **Name**: `@` (ou `www` para subdomínio)
   - **Target**: `<tunnel-id>.cfargotunnel.com`
   - **Proxy**: ✅ (laranja - ativado)
3. Salve

**Aguarde alguns minutos** para propagar.

---

## ✅ PASSO 7: Verificar

### 7.1. Testar Aplicação

1. Acesse: `https://fabricadosdados.com.br`
2. Deve carregar sua aplicação!

### 7.2. Testar Webhook Stripe

1. No Stripe Dashboard → Webhooks
2. Atualize a URL: `https://fabricadosdados.com.br/api/webhooks/stripe`
3. Envie evento de teste
4. Deve funcionar!

---

## 🔧 PASSO 8: Configurar Variáveis de Ambiente

No seu servidor local, certifique-se de que o `.env` tem:

```env
# URL pública (agora com domínio real!)
VITE_APP_URL=https://fabricadosdados.com.br

# Stripe (use URL real agora)
STRIPE_WEBHOOK_SECRET=whsec_...

# Demais variáveis...
```

---

## 🔄 PASSO 9: Manter Rodando

### Opção 1: Serviço Windows (Recomendado)

```powershell
# Instalar como serviço
cloudflared service install

# Iniciar
net start cloudflared

# Parar
net stop cloudflared

# Status
sc query cloudflared
```

### Opção 2: PM2 (se usar Node.js)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start "node dist/index.js" --name saas

# Iniciar tunnel
pm2 start "cloudflared tunnel run" --name tunnel

# Salvar
pm2 save
pm2 startup
```

### Opção 3: Task Scheduler (Windows)

1. Abra **Agendador de Tarefas**
2. Criar tarefa básica
3. Ação: Iniciar programa
4. Programa: `C:\caminho\para\cloudflared.exe`
5. Argumentos: `tunnel run`
6. Configurar para iniciar com Windows

---

## 🐛 Troubleshooting

### Problema: Tunnel não conecta

**Solução:**
- Verifique se está autenticado: `cloudflared tunnel list`
- Verifique se o arquivo de config está correto
- Verifique se o tunnel ID está correto

### Problema: DNS não resolve

**Solução:**
- Aguarde alguns minutos (propagação DNS)
- Verifique se o CNAME está correto
- Verifique se o proxy está ativado (laranja)

### Problema: Webhook não funciona

**Solução:**
- Verifique se a rota `/api/webhooks/stripe` está no config
- Verifique se o servidor está rodando na porta 3000
- Teste localmente primeiro: `curl http://localhost:3000/api/webhooks/stripe`

### Problema: Aplicação não carrega

**Solução:**
- Verifique se o servidor Node.js está rodando
- Verifique os logs do tunnel: `cloudflared tunnel run --loglevel debug`
- Verifique se a porta está correta no config

---

## 📊 Monitoramento

### Ver Status do Tunnel

```powershell
cloudflared tunnel list
cloudflared tunnel info <tunnel-id>
```

### Ver Logs

```powershell
# Logs em tempo real
cloudflared tunnel run --loglevel debug

# Logs do serviço Windows
Get-EventLog -LogName Application -Source cloudflared
```

---

## 🔒 Segurança

### Recomendações:

1. ✅ Use HTTPS (Cloudflare faz automaticamente)
2. ✅ Mantenha tunnel rodando como serviço
3. ✅ Configure firewall local (não precisa abrir portas)
4. ✅ Use variáveis de ambiente para secrets
5. ✅ Monitore logs regularmente

---

## 💰 Custos

**Cloudflare Tunnel:**
- ✅ **Gratuito** no plano free
- ✅ Até 50 usuários simultâneos
- ✅ Ilimitado para uso pessoal/pequeno

**Para mais:**
- Planos pagos começam em $3/mês
- Geralmente não precisa para MVP

---

## 🎯 Vantagens vs EasyPanel

| Aspecto | Cloudflare Tunnel | EasyPanel |
|---------|-------------------|-----------|
| **Setup** | 10 minutos | 30-60 minutos |
| **Custo** | Grátis | VPS necessário |
| **HTTPS** | Automático | Automático |
| **Escalabilidade** | Limitada (free) | Ilimitada |
| **Gerenciamento** | Básico | Avançado |
| **Melhor para** | MVP/Testes | Produção |

---

## 📝 Checklist Final

- [ ] Cloudflared instalado
- [ ] Autenticado no Cloudflare
- [ ] Tunnel criado
- [ ] Config.yml configurado
- [ ] DNS configurado
- [ ] Tunnel rodando
- [ ] Aplicação acessível
- [ ] Webhook Stripe funcionando

---

## 🚀 Próximos Passos

1. **Teste localmente** primeiro
2. **Configure tunnel** seguindo os passos
3. **Teste webhook** do Stripe
4. **Configure como serviço** para produção
5. **Monitore logs** regularmente

---

**É realmente mais simples que EasyPanel! Vamos fazer?** 🎉

