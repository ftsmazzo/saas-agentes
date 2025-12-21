# ⚙️ Ajustes Necessários no EasyPanel

## 1. Mudar DATABASE_URL

No EasyPanel, vá em **Environment Variables** e altere:

**ANTES:**
```
DATABASE_URL=mysql://saas_agentes:Fs142779@saas-agentes_mysql:3306/saas_agentes
```

**DEPOIS (PostgreSQL):**
```
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/postgres
```

**Exemplo PostgreSQL local:**
```
DATABASE_URL=postgresql://postgres:senha@localhost:5432/saas_agentes
```

## 2. Executar SQL no PostgreSQL Principal

Execute o arquivo `SQL_TABELAS_PROJETO.sql` no seu PostgreSQL principal.

**Isso cria APENAS as tabelas do PROJETO:**
- users, tenants, plans, agentConfigs, usageMetrics, platformLogs, etc.

**IMPORTANTE:** As tabelas dos AGENTES (chats, chat_messages, dados_cliente) são criadas automaticamente pelo workflow N8N quando um agente é criado.

## 3. Redeploy

No EasyPanel, clique em **Redeploy** para aplicar as mudanças.

---

**Pronto!** O código já está atualizado no GitHub. Só precisa:
1. ✅ Mudar DATABASE_URL no EasyPanel (PostgreSQL principal)
2. ✅ Executar `SQL_TABELAS_PROJETO.sql` no PostgreSQL
3. ✅ Redeploy no EasyPanel

