# ✅ Passos Após Migração para PostgreSQL

## 📋 Checklist

### 1. ✅ Executar SQL das Tabelas do Projeto

Execute o arquivo `SQL_TABELAS_PROJETO.sql` no seu PostgreSQL:

**No EasyPanel:**
1. Vá no serviço PostgreSQL (`postgres-saas`)
2. Clique em **"Terminal"** ou **"SQL Editor"**
3. Cole e execute o conteúdo de `SQL_TABELAS_PROJETO.sql`

**Ou via pgAdmin:**
1. Conecte ao PostgreSQL
2. Execute o arquivo `SQL_TABELAS_PROJETO.sql`

---

### 2. ✅ Criar Usuário Admin

Execute o arquivo `criar-admin-postgresql.sql`:

**Credenciais padrão:**
- **Email:** `fredmazzo@gmail.com`
- **Senha:** `Admin123!`

**Para mudar a senha:**
1. Gere um hash bcrypt em: https://bcrypt-generator.com/
2. Edite o arquivo `criar-admin-postgresql.sql`
3. Substitua `password_hash` pelo hash gerado
4. Execute o script

---

### 3. ✅ Verificar DATABASE_URL

No EasyPanel, verifique se `DATABASE_URL` está correto:

```
postgresql://saas_admin:Fs142779@1524@saas-agentes_postgres-saas:5432/saas_agentes?sslmode=disable
```

**Importante:** Use o **nome do serviço** (`saas-agentes_postgres-saas`) como host, não `localhost`!

---

### 4. ✅ Fazer Redeploy

No EasyPanel:
1. Vá no serviço `saas_agentes`
2. Clique em **"Implantar"** (Deploy)
3. Aguarde o build completar

---

### 5. ✅ Testar Acesso Admin

1. Acesse: `https://seu-dominio.com/admin/login`
2. Faça login com:
   - **Email:** `fredmazzo@gmail.com`
   - **Senha:** `Admin123!`
3. Deve entrar no painel admin

---

## 🔍 Verificar se Funcionou

### Verificar Tabelas Criadas

Execute no PostgreSQL:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deve mostrar:
- `activationTokens`
- `agentConfigs`
- `chatMessages`
- `contacts`
- `conversations`
- `plans`
- `platformLogs`
- `system_config`
- `tenants`
- `usageMetrics`
- `users`

### Verificar Admin Criado

Execute:
```sql
SELECT id, email, name, role, 
       CASE WHEN "passwordHash" IS NOT NULL THEN 'OK' ELSE 'SEM SENHA' END as status
FROM users 
WHERE role = 'admin';
```

Deve retornar pelo menos 1 linha com `status = 'OK'`.

---

## ⚠️ Problemas Comuns

### Erro: "Email ou senha inválidos"

**Solução:**
1. Verifique se executou `criar-admin-postgresql.sql`
2. Verifique se o email está correto: `fredmazzo@gmail.com`
3. Verifique se a senha está correta: `Admin123!`

### Erro: "Senha não definida"

**Solução:**
1. Execute `criar-admin-postgresql.sql` novamente
2. Verifique se o campo `passwordHash` foi preenchido:
   ```sql
   SELECT email, "passwordHash" IS NOT NULL as tem_senha 
   FROM users 
   WHERE email = 'fredmazzo@gmail.com';
   ```

### Erro de Conexão com Banco

**Solução:**
1. Verifique se `DATABASE_URL` está correto no EasyPanel
2. Verifique se o serviço PostgreSQL está rodando
3. Verifique se o nome do serviço está correto (use o nome interno do EasyPanel)

---

## 📝 Próximos Passos

Após confirmar que tudo está funcionando:

1. ✅ Criar primeiro cliente (tenant)
2. ✅ Testar criação de agente N8N
3. ✅ Verificar se tabelas dos agentes são criadas automaticamente
4. ✅ Testar integração completa

---

**Pronto!** Seu admin está configurado e você pode acessar o painel. 🚀

