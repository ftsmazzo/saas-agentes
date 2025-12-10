# 🔧 Troubleshooting: Webhook 404 Error

## ❌ Problema Identificado

O Stripe está retornando **404** ao tentar acessar:
```
https://fabricadosdados.com.br/api/webhooks/stripe
```

O HTML retornado mostra uma página 404 genérica de servidor web (cPanel/hosting), o que indica que:
- O domínio está apontando para um servidor web (Apache/Nginx)
- Mas o servidor Node.js não está recebendo as requisições

---

## 🔍 Diagnóstico

### 1. Verificar se o servidor Node.js está rodando

```bash
# No servidor, verifique se o processo está rodando
ps aux | grep node
# ou
pm2 list  # se usar PM2
```

### 2. Verificar se a porta está acessível

```bash
# Teste localmente no servidor
curl http://localhost:3000/api/webhooks/stripe
# ou a porta que você configurou
```

### 3. Verificar configuração do domínio

O problema mais comum é que o domínio está apontando para um servidor web (Apache/Nginx) que não está configurado para fazer proxy reverso para o Node.js.

---

## ✅ Soluções

### Solução 1: Configurar Proxy Reverso (Nginx/Apache)

Se você tem Nginx ou Apache na frente, precisa configurar proxy reverso.

#### Para Nginx:

Crie/edite: `/etc/nginx/sites-available/fabricadosdados.com.br`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name fabricadosdados.com.br www.fabricadosdados.com.br;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name fabricadosdados.com.br www.fabricadosdados.com.br;

    # Certificado SSL
    ssl_certificate /caminho/para/certificado.crt;
    ssl_certificate_key /caminho/para/chave.key;

    # Proxy para Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # IMPORTANTE: Rota específica para webhook (raw body)
    location /api/webhooks/stripe {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Manter body raw para webhook
        proxy_set_header Content-Type application/json;
        proxy_pass_request_body on;
    }
}
```

Depois:
```bash
# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

#### Para Apache:

Crie/edite: `/etc/apache2/sites-available/fabricadosdados.com.br.conf`

```apache
<VirtualHost *:80>
    ServerName fabricadosdados.com.br
    ServerAlias www.fabricadosdados.com.br
    
    # Redirecionar para HTTPS
    Redirect permanent / https://fabricadosdados.com.br/
</VirtualHost>

<VirtualHost *:443>
    ServerName fabricadosdados.com.br
    ServerAlias www.fabricadosdados.com.br

    # SSL
    SSLEngine on
    SSLCertificateFile /caminho/para/certificado.crt
    SSLCertificateKeyFile /caminho/para/chave.key

    # Proxy para Node.js
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # IMPORTANTE: Rota específica para webhook
    <Location /api/webhooks/stripe>
        ProxyPass http://localhost:3000/api/webhooks/stripe
        ProxyPassReverse http://localhost:3000/api/webhooks/stripe
    </Location>
</VirtualHost>
```

Depois:
```bash
# Habilitar módulos necessários
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod rewrite

# Habilitar site
sudo a2ensite fabricadosdados.com.br.conf

# Recarregar Apache
sudo systemctl reload apache2
```

---

### Solução 2: Usar EasyPanel (se aplicável)

Se você está usando EasyPanel:

1. Acesse o EasyPanel
2. Vá em **"Projects"** → Seu projeto
3. Configure **"Domains"**:
   - Adicione: `fabricadosdados.com.br`
   - Configure SSL (Let's Encrypt)
4. Verifique se o serviço Node.js está rodando na porta correta
5. EasyPanel geralmente já configura proxy reverso automaticamente

---

### Solução 3: Verificar Porta e Processo

1. **Verificar em qual porta o Node.js está rodando:**
   ```bash
   # No servidor
   netstat -tulpn | grep node
   # ou
   ss -tulpn | grep node
   ```

2. **Verificar se o processo está escutando:**
   ```bash
   # Deve mostrar algo como:
   # tcp 0 0 0.0.0.0:3000 LISTEN node
   ```

3. **Se não estiver rodando, iniciar:**
   ```bash
   # Opção 1: Direto
   cd /caminho/do/projeto
   npm start
   # ou
   pnpm start

   # Opção 2: Com PM2 (recomendado)
   pm2 start server/_core/index.ts --name saas
   pm2 save
   pm2 startup
   ```

---

### Solução 4: Testar Endpoint Localmente

No servidor, teste se o endpoint funciona:

```bash
# Teste local
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Deve retornar algo (mesmo que erro de assinatura)
```

Se funcionar localmente mas não de fora, o problema é proxy/firewall.

---

### Solução 5: Verificar Firewall

```bash
# Verificar se a porta está aberta
sudo ufw status
# ou
sudo firewall-cmd --list-all

# Se necessário, abrir porta
sudo ufw allow 3000/tcp
# ou
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

---

## 🧪 Teste Rápido

### 1. Teste do servidor Node.js

```bash
# No servidor
curl http://localhost:3000/api/webhooks/stripe
```

**Esperado**: Alguma resposta (mesmo que erro de método ou assinatura)

### 2. Teste do domínio

```bash
# De qualquer lugar
curl https://fabricadosdados.com.br/api/webhooks/stripe
```

**Esperado**: Mesma resposta do teste local

### 3. Teste do webhook do Stripe

No Stripe Dashboard → Webhooks → Seu webhook → "Send test webhook"

**Esperado**: Status 200 (não 404)

---

## 📋 Checklist de Verificação

- [ ] Servidor Node.js está rodando?
- [ ] Servidor está escutando na porta correta?
- [ ] Proxy reverso (Nginx/Apache) configurado?
- [ ] SSL/HTTPS configurado?
- [ ] Firewall permite conexões?
- [ ] Domínio aponta para o servidor correto?
- [ ] Endpoint funciona localmente?
- [ ] Endpoint funciona via domínio?

---

## 🆘 Se Nada Funcionar

### Opção Temporária: Usar ngrok

Enquanto resolve a configuração do servidor:

1. Instale ngrok no servidor
2. Execute: `ngrok http 3000`
3. Use a URL do ngrok no webhook do Stripe
4. Isso permite testar enquanto configura o domínio

### Verificar Logs

```bash
# Logs do Node.js
pm2 logs saas
# ou
tail -f /caminho/para/logs

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs do Apache
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log
```

---

## 🎯 Próximos Passos

1. **Identifique qual servidor web está na frente** (Nginx, Apache, EasyPanel)
2. **Configure proxy reverso** conforme a solução acima
3. **Teste o endpoint** localmente primeiro
4. **Teste via domínio** depois
5. **Teste webhook do Stripe** por último

---

**Precisa de ajuda?** Me diga:
- Qual servidor web você está usando? (Nginx, Apache, EasyPanel, outro?)
- O Node.js está rodando? Em qual porta?
- Como você acessa o servidor normalmente?

