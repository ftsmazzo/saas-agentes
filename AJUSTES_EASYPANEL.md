# ⚙️ Ajustes Necessários no EasyPanel

## 1. Mudar DATABASE_URL

No EasyPanel, vá em **Environment Variables** e altere:

**ANTES:**
```
DATABASE_URL=mysql://saas_agentes:Fs142779@saas-agentes_mysql:3306/saas_agentes
```

**DEPOIS (PostgreSQL/Supabase):**
```
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/postgres
```

**Exemplo Supabase:**
```
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

## 2. Executar SQL

No Supabase Dashboard → SQL Editor, execute o arquivo:
- `SQL_TABELAS_WORKFLOW_N8N.sql`

Isso cria as tabelas do workflow N8N com `tenant_id`.

## 3. Redeploy

No EasyPanel, clique em **Redeploy** para aplicar as mudanças.

---

**Pronto!** O código já está atualizado no GitHub. Só precisa:
1. ✅ Mudar DATABASE_URL no EasyPanel
2. ✅ Executar SQL no Supabase
3. ✅ Redeploy no EasyPanel

