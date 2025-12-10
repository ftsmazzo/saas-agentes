# 🚀 Deploy no EasyPanel com Docker

Este guia vai te ajudar a fazer deploy da aplicação SaaS no EasyPanel como uma aplicação Docker personalizada.

---

## ✅ Vantagens do Deploy no EasyPanel

- ✅ **Domínio próprio**: Resolve problema do webhook Stripe
- ✅ **HTTPS automático**: Let's Encrypt configurado automaticamente
- ✅ **Gerenciamento fácil**: Interface visual para gerenciar
- ✅ **Escalabilidade**: Fácil de escalar recursos
- ✅ **Backup automático**: EasyPanel gerencia backups
- ✅ **Logs centralizados**: Fácil de debugar

---

## 📋 Pré-requisitos

- [ ] Conta no EasyPanel
- [ ] Acesso SSH ao servidor EasyPanel (ou via interface)
- [ ] Repositório Git (GitHub, GitLab, etc.) - **RECOMENDADO**
- [ ] Banco de dados MySQL já configurado no EasyPanel

---

## 🐳 PASSO 1: Preparar Dockerfile

O arquivo `Dockerfile` já foi criado. Ele:
- Usa Node.js 20 Alpine (leve)
- Build em multi-stage (otimizado)
- Executa como usuário não-root (seguro)
- Inclui healthcheck

**Verifique se está correto:**
```bash
cat Dockerfile
```

---

## 📦 PASSO 2: Preparar Repositório Git (Recomendado)

### 2.1. Criar Repositório

1. Crie um repositório no GitHub/GitLab
2. Faça commit dos arquivos:

```bash
git init
git add .
git commit -m "Initial commit - SaaS Agentes"
git remote add origin https://github.com/seu-usuario/saas-agentes.git
git push -u origin main
```

### 2.2. Arquivos Importantes

Certifique-se de que estes arquivos estão no repositório:
- ✅ `Dockerfile`
- ✅ `.dockerignore`
- ✅ `package.json`
- ✅ `pnpm-lock.yaml`
- ✅ Todo o código fonte

**NÃO commite:**
- ❌ `.env` (variáveis de ambiente)
- ❌ `node_modules/`
- ❌ `dist/`

---

## 🔧 PASSO 3: Configurar no EasyPanel

### 3.1. Criar Novo Projeto

1. Acesse seu EasyPanel
2. Clique em **"Projects"** → **"New Project"**
3. Nome: `saas-agentes`
4. Clique em **"Create"**

### 3.2. Adicionar Aplicação Docker

1. No projeto criado, clique em **"New Service"**
2. Selecione **"Docker Image"** ou **"Custom Docker"**
3. Preencha:

**Configuração Básica:**
- **Name**: `saas-app`
- **Image**: Se usar repositório Git, EasyPanel pode buildar automaticamente
- **Port**: `3000`
- **Build Method**: 
  - Se usar Git: **"Build from Git"**
  - Se usar imagem: **"Use existing image"**

**Se usar Build from Git:**
- **Repository URL**: `https://github.com/seu-usuario/saas-agentes.git`
- **Branch**: `main` (ou `master`)
- **Dockerfile Path**: `Dockerfile` (ou deixe vazio se estiver na raiz)
- **Build Context**: `.` (raiz do repositório)

**Se usar imagem existente:**
- Você precisa fazer build e push para um registry (Docker Hub, etc.)

### 3.3. Configurar Domínio

1. Na aplicação criada, vá em **"Domains"**
2. Adicione: `fabricadosdados.com.br`
3. EasyPanel configurará SSL automaticamente (Let's Encrypt)

### 3.4. Configurar Variáveis de Ambiente

1. Na aplicação, vá em **"Environment Variables"**
2. Adicione todas as variáveis do `.env`:

```env
# Database
DATABASE_URL=mysql://usuario:senha@host:porta/banco

# Stripe
STRIPE_SANDBOX_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=contato@fabricadosdados.com.br

# Evolution API
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave

# N8N
N8N_API_URL=https://seu-n8n.com
N8N_TEMPLATE_WORKFLOW_ID=EUesWjXPlJHYCxNO
N8N_API_KEY=sua_chave

# Chatwoot
CHATWOOT_URL=https://seu-chatwoot.com
CHATWOOT_API_TOKEN=seu_token
CHATWOOT_ACCOUNT_ID=1

# App URL
VITE_APP_URL=https://fabricadosdados.com.br
NODE_ENV=production
PORT=3000
```

⚠️ **IMPORTANTE**: 
- Não use `localhost` nas URLs
- Use URLs completas com `https://`
- `VITE_APP_URL` deve ser o domínio público

### 3.5. Configurar Recursos

1. Vá em **"Resources"**
2. Configure:
   - **CPU**: Mínimo 0.5, recomendado 1-2 cores
   - **Memory**: Mínimo 512MB, recomendado 1-2GB
   - **Storage**: 1-2GB (para build)

### 3.6. Configurar Rede

1. Vá em **"Network"**
2. Certifique-se de que a porta `3000` está exposta
3. EasyPanel geralmente configura automaticamente

---

## 🔄 PASSO 4: Build e Deploy

### 4.1. Build Automático (se usar Git)

1. Após configurar, EasyPanel fará build automaticamente
2. Acompanhe os logs em **"Logs"** → **"Build Logs"**
3. Aguarde o build completar

### 4.2. Build Manual (se necessário)

Se precisar fazer build manual:

```bash
# No servidor EasyPanel (via SSH)
cd /path/to/project
docker build -t saas-agentes:latest .
docker run -d -p 3000:3000 --env-file .env saas-agentes:latest
```

---

## ✅ PASSO 5: Verificar Deploy

### 5.1. Verificar Status

1. Na aplicação, verifique **"Status"**
2. Deve mostrar **"Running"** (verde)

### 5.2. Verificar Logs

1. Vá em **"Logs"** → **"Application Logs"**
2. Deve aparecer:
   ```
   Server running on http://localhost:3000/
   ```

### 5.3. Testar Aplicação

1. Acesse: `https://fabricadosdados.com.br`
2. Deve carregar a landing page
3. Teste criar um tenant

### 5.4. Testar Webhook Stripe

1. No Stripe Dashboard, atualize o webhook:
   - URL: `https://fabricadosdados.com.br/api/webhooks/stripe`
2. Envie evento de teste
3. Verifique logs no EasyPanel

---

## 🔧 PASSO 6: Configurar Banco de Dados

### 6.1. Conectar ao MySQL do EasyPanel

1. No EasyPanel, vá em **"Databases"**
2. Encontre seu MySQL
3. Copie a connection string
4. Use no `DATABASE_URL`:
   ```
   mysql://usuario:senha@host:3306/banco
   ```

### 6.2. Executar Migrações

Se precisar executar migrações manualmente:

```bash
# Via SSH no servidor EasyPanel
docker exec -it <container-id> sh
cd /app
pnpm db:push
```

Ou via EasyPanel:
1. Vá em **"Terminal"** da aplicação
2. Execute: `pnpm db:push`

---

## 🔄 PASSO 7: Atualizar Código (Deploy Contínuo)

### 7.1. Fazer Alterações

1. Faça alterações no código local
2. Commit e push:
   ```bash
   git add .
   git commit -m "Descrição das alterações"
   git push
   ```

### 7.2. Rebuild no EasyPanel

1. No EasyPanel, vá na aplicação
2. Clique em **"Rebuild"** ou **"Redeploy"**
3. Aguarde build e restart

**Ou configure auto-deploy:**
- EasyPanel pode fazer rebuild automático quando detectar push no Git

---

## 🐛 Troubleshooting

### Problema: Build falha

**Solução:**
- Verifique logs de build no EasyPanel
- Certifique-se de que `Dockerfile` está correto
- Verifique se todas as dependências estão no `package.json`

### Problema: Aplicação não inicia

**Solução:**
- Verifique logs da aplicação
- Verifique variáveis de ambiente
- Verifique se a porta está correta
- Verifique se o banco de dados está acessível

### Problema: Webhook não funciona

**Solução:**
- Verifique se o domínio está configurado
- Verifique se HTTPS está ativo
- Verifique se a URL do webhook está correta
- Verifique logs da aplicação quando webhook chega

### Problema: Erro de conexão com banco

**Solução:**
- Verifique `DATABASE_URL` nas variáveis de ambiente
- Verifique se o MySQL está acessível da aplicação
- Verifique firewall/network do EasyPanel

---

## 📊 Monitoramento

### Logs

- **Application Logs**: Logs da aplicação Node.js
- **Build Logs**: Logs do build Docker
- **System Logs**: Logs do sistema

### Métricas

- **CPU Usage**: Uso de CPU
- **Memory Usage**: Uso de memória
- **Network**: Tráfego de rede

---

## 🔒 Segurança

### Recomendações:

1. ✅ Use HTTPS (EasyPanel configura automaticamente)
2. ✅ Não commite `.env` no Git
3. ✅ Use variáveis de ambiente no EasyPanel
4. ✅ Mantenha dependências atualizadas
5. ✅ Use secrets do EasyPanel para dados sensíveis

---

## 📝 Checklist Final

Antes de considerar deploy completo:

- [ ] Dockerfile criado e testado
- [ ] Repositório Git configurado
- [ ] Aplicação criada no EasyPanel
- [ ] Domínio configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido
- [ ] Aplicação rodando
- [ ] Landing page acessível
- [ ] Webhook Stripe funcionando
- [ ] Banco de dados conectado
- [ ] Teste completo de checkout

---

## 🎯 Próximos Passos

Após deploy funcionando:

1. **Configurar backup automático**
2. **Configurar monitoramento**
3. **Otimizar recursos** (CPU/Memory)
4. **Configurar CI/CD** (opcional)
5. **Documentar processos**

---

## 🆘 Suporte

Se tiver problemas:

1. Verifique logs no EasyPanel
2. Verifique status da aplicação
3. Teste localmente primeiro
4. Consulte documentação do EasyPanel

---

**Boa sorte com o deploy! 🚀**

