# ⚡ Quick Start: Cloudflare Tunnel (5 minutos)

## 🎯 Passos Rápidos

### 1. Instalar Cloudflared

**Windows:**
- Baixe: https://github.com/cloudflare/cloudflared/releases/latest
- Baixe: `cloudflared-windows-amd64.exe`
- Renomeie para `cloudflared.exe`
- Coloque em `C:\cloudflared\`

### 2. Autenticar

```powershell
C:\cloudflared\cloudflared.exe login
```

### 3. Criar Tunnel no Dashboard

1. Acesse: https://one.dash.cloudflare.com/
2. Zero Trust → Networks → Tunnels
3. Create a tunnel → Cloudflared
4. Nome: `saas-agentes`
5. Salve

### 4. Instalar Token

Copie o comando que aparece e execute:

```powershell
C:\cloudflared\cloudflared.exe service install <token>
```

### 5. Configurar DNS

1. Cloudflare Dashboard → DNS
2. Adicione CNAME:
   - Name: `@`
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy: ✅ ON

### 6. Iniciar

```powershell
# Iniciar serviço
net start cloudflared
```

### 7. Testar

Acesse: `https://fabricadosdados.com.br`

---

## ✅ Pronto!

Sua aplicação está online com HTTPS automático!

**Atualize webhook Stripe:**
`https://fabricadosdados.com.br/api/webhooks/stripe`

---

📖 **Guia completo**: Veja `DEPLOY_CLOUDFLARE_TUNNEL.md`

