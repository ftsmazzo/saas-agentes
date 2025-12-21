# 🔐 Configuração PostgreSQL no EasyPanel

## Opções de Conexão

### ✅ OPÇÃO 1: URL Interna (RECOMENDADO - Mais Seguro)

Se o **N8N está no mesmo EasyPanel** que o PostgreSQL:

**No EasyPanel:**
1. Crie o serviço PostgreSQL
2. Nome do serviço: `saas-agentes-postgres` (ou o nome que você escolher)
3. **NÃO exponha porta publicamente** (deixe apenas interna)

**URL para usar no N8N:**
```
postgresql://postgres:senha@saas-agentes-postgres:5432/saas_agentes
```

**Vantagens:**
- ✅ Mais seguro (não exposto na internet)
- ✅ Mais rápido (comunicação interna)
- ✅ Não precisa configurar firewall
- ✅ Não precisa SSL/TLS para comunicação interna

**Como configurar:**
1. No N8N (EasyPanel), crie credencial PostgreSQL
2. Host: `saas-agentes-postgres` (nome do serviço)
3. Port: `5432`
4. Database: `saas_agentes`
5. User: `postgres`
6. Password: (a senha que você configurou)

---

### ⚠️ OPÇÃO 2: URL Pública (Se N8N estiver fora do EasyPanel)

Se o **N8N está em outro servidor** ou precisa acessar externamente:

**No EasyPanel:**
1. Exponha a porta PostgreSQL (ex: `5432`)
2. Configure firewall para permitir apenas IP do N8N
3. Use SSL/TLS obrigatório

**URL para usar:**
```
postgresql://postgres:senha@seu-dominio.com:5432/saas_agentes?sslmode=require
```

**Desvantagens:**
- ❌ Menos seguro (exposto na internet)
- ❌ Precisa configurar SSL/TLS
- ❌ Precisa configurar firewall
- ❌ Mais lento (comunicação externa)

---

## 🎯 Recomendação

**Use URL INTERNA** se:
- ✅ N8N está no mesmo EasyPanel
- ✅ Todos os serviços estão na mesma rede Docker

**Use URL PÚBLICA** apenas se:
- ⚠️ N8N está em outro servidor
- ⚠️ Precisa acessar de fora do EasyPanel

---

## 📋 Passo a Passo (URL Interna)

### 1. Criar PostgreSQL no EasyPanel

1. No projeto `saas-agentes`, clique em **"New Service"**
2. Selecione **"PostgreSQL"**
3. Configure:
   - **Name**: `saas-agentes-postgres`
   - **Database**: `saas_agentes`
   - **User**: `postgres`
   - **Password**: (defina uma senha forte)
   - **Port**: `5432` (deixe apenas interna, não exponha)

### 2. Executar SQL

1. No PostgreSQL criado, vá em **"Terminal"**
2. Execute o arquivo `SQL_TABELAS_PROJETO.sql`

Ou via SQL Editor:
1. Conecte ao PostgreSQL
2. Cole e execute o conteúdo de `SQL_TABELAS_PROJETO.sql`

### 3. Configurar N8N

1. No N8N (EasyPanel), vá em **"Credentials"**
2. Crie nova credencial **"PostgreSQL"**
3. Preencha:
   - **Host**: `saas-agentes-postgres` (nome do serviço PostgreSQL)
   - **Port**: `5432`
   - **Database**: `saas_agentes`
   - **User**: `postgres`
   - **Password**: (a senha que você configurou)

### 4. Atualizar DATABASE_URL na Aplicação

No serviço da aplicação principal, atualize:

```env
DATABASE_URL=postgresql://postgres:senha@saas-agentes-postgres:5432/saas_agentes
```

**Importante:** Use o **nome do serviço** (`saas-agentes-postgres`), não `localhost`!

---

## 🔍 Verificar Conexão

Para testar se está funcionando:

1. No N8N, crie um workflow de teste
2. Adicione um nó **"PostgreSQL"**
3. Configure com a credencial criada
4. Execute query: `SELECT 1;`
5. Se retornar `1`, está funcionando! ✅

---

## 🛡️ Segurança

**Com URL Interna:**
- ✅ PostgreSQL não está exposto na internet
- ✅ Apenas serviços do EasyPanel podem acessar
- ✅ Comunicação via rede Docker interna

**Se precisar expor publicamente:**
- ⚠️ Configure SSL/TLS obrigatório
- ⚠️ Restrinja acesso por IP (firewall)
- ⚠️ Use senha forte
- ⚠️ Considere usar VPN ou túnel

---

## 📝 Resumo

**Para seu caso (N8N no EasyPanel):**

1. ✅ Use URL interna: `postgresql://postgres:senha@saas-agentes-postgres:5432/saas_agentes`
2. ✅ NÃO exponha porta PostgreSQL publicamente
3. ✅ Configure credencial no N8N usando nome do serviço
4. ✅ Atualize `DATABASE_URL` na aplicação principal

**Pronto!** Mais seguro e mais rápido. 🚀

