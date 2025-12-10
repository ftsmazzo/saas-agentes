# 🖥️ Setup Local - Windows (Recursos Limitados)

## 📋 Requisitos Mínimos

### O que você precisa ter instalado:
1. **Node.js** (v18 ou superior) - [Download](https://nodejs.org/)
2. **pnpm** (gerenciador de pacotes) - Instalar: `npm install -g pnpm`
3. **Git** (opcional, mas recomendado)

### O que NÃO precisa rodar localmente:
- ❌ PostgreSQL (pode usar remoto - seu VPS)
- ❌ Evolution API (já está no VPS)
- ❌ Chatwoot (já está no VPS)
- ❌ N8N (já está no VPS)

### O que VAI rodar localmente:
- ✅ Servidor Node.js (backend)
- ✅ Vite Dev Server (frontend)
- ✅ Banco de dados MySQL (pode usar remoto ou local simples)

---

## 🚀 Setup Rápido (Passo a Passo)

### 1. Instalar Dependências

```bash
# Na pasta do projeto
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# ============================================
# BANCO DE DADOS
# ============================================
# Opção 1: Usar banco remoto (seu VPS)
DATABASE_URL=mysql://usuario:senha@seu-vps.com:3306/nome_do_banco

# Opção 2: Usar banco local (mais fácil para testar)
# DATABASE_URL=mysql://root:senha@localhost:3306/saas_agentes

# ============================================
# AUTENTICAÇÃO (Manus OAuth - Admin)
# ============================================
VITE_APP_ID=seu_app_id_manus
JWT_SECRET=sua_chave_secreta_jwt
OAUTH_SERVER_URL=https://oauth.manus.space
OWNER_OPEN_ID=seu_open_id

# ============================================
# STRIPE (Sandbox para testes)
# ============================================
STRIPE_SANDBOX_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (opcional para testes locais)

# ============================================
# EMAIL (Resend)
# ============================================
RESEND_API_KEY=re_... (vou criar a integração)

# ============================================
# SERVIÇOS REMOTOS (seu VPS)
# ============================================
EVOLUTION_API_URL=https://evolution.seu-vps.com
EVOLUTION_API_KEY=sua_chave_evolution

CHATWOOT_URL=https://chatwoot.seu-vps.com
CHATWOOT_API_TOKEN=seu_token
CHATWOOT_ACCOUNT_ID=1

N8N_API_URL=https://n8n.seu-vps.com
N8N_API_KEY=sua_chave_n8n
N8N_TEMPLATE_WORKFLOW_ID=123

# ============================================
# APP
# ============================================
VITE_APP_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

### 3. Rodar o Projeto

```bash
# Terminal 1: Backend + Frontend (tudo junto)
pnpm dev
```

O servidor vai rodar em: `http://localhost:3000`

---

## 🧪 Como Testar Localmente

### Opção 1: Teste Completo (Recomendado)

1. **Usar serviços do VPS** (Evolution, Chatwoot, N8N)
   - Mais realista
   - Testa integrações reais
   - Precisa de internet

2. **Usar banco remoto ou local**
   - Remoto: Mais fácil (já configurado)
   - Local: Precisa instalar MySQL

### Opção 2: Teste Simplificado (Sem VPS)

1. **Mockar serviços externos** (para desenvolvimento)
   - Evolution API → Mock
   - Chatwoot → Mock
   - N8N → Mock
   - Stripe → Usar modo teste

2. **Focar em funcionalidades core**
   - Login de clientes
   - Email de ativação
   - Painel do cliente
   - Fluxo básico

---

## 🔧 Configuração Mínima para Testar

### Para testar apenas o MVP (FASE 1):

**Variáveis OBRIGATÓRIAS:**
```env
DATABASE_URL=mysql://...
RESEND_API_KEY=re_...
VITE_APP_URL=http://localhost:3000
PORT=3000
```

**Variáveis OPCIONAIS (pode mockar depois):**
```env
EVOLUTION_API_URL=http://localhost:8080 (mock)
CHATWOOT_URL=http://localhost:3001 (mock)
N8N_API_URL=http://localhost:5678 (mock)
STRIPE_SANDBOX_SECRET_KEY=sk_test_... (modo teste)
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Erro: "Port 3000 already in use"
```bash
# Mudar porta no .env
PORT=3001
```

### Erro: "Database connection failed"
- Verificar se MySQL está rodando
- Verificar credenciais no `.env`
- Testar conexão: `mysql -h host -u user -p`

### Erro: "Out of memory"
- Fechar outros programas
- Usar `NODE_OPTIONS=--max-old-space-size=2048` antes do comando

---

## 📝 Checklist de Setup

- [ ] Node.js instalado (`node --version`)
- [ ] pnpm instalado (`pnpm --version`)
- [ ] Arquivo `.env` criado
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Servidor rodando (`pnpm dev`)
- [ ] Acessar `http://localhost:3000`

---

## 🎯 Próximos Passos

1. **Configurar `.env`** com suas credenciais
2. **Rodar `pnpm dev`**
3. **Testar acesso**: `http://localhost:3000`
4. **Começar FASE 1**: Vou implementar agora!

---

## 💡 Dica

Para testar webhook do Stripe localmente, use:
- **Stripe CLI**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Ou use **ngrok** para expor localhost: `ngrok http 3000`

Mas para o MVP, podemos testar sem webhook primeiro (usar botão de teste).

---

**Pronto para começar?** Vou implementar a FASE 1 agora! 🚀

