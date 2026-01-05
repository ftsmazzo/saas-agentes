# 🔧 Correção: Tabela clientData não encontrada no N8N

## ❌ Problema

Ao executar a query no N8N para atualizar o status da IA quando um humano assume a conversa, ocorre o erro:

```
relation "clientData" does not exist
```

## 🔍 Causa

A tabela `clientData` não foi criada no banco de dados PostgreSQL. Esta tabela é necessária para:
- Armazenar o status do serviço de IA por cliente (`aiService`: 'active' ou 'pause')
- Controlar quando a IA deve ser interrompida (atendimento humano)
- Gerenciar o estado de atendimento por telefone

## ✅ Solução

### Opção 1: Executar Script SQL (Recomendado)

Execute o script `SQL_CRIAR_CLIENTDATA.sql` no banco de dados principal:

```bash
# Via psql
psql -h [HOST] -U [USER] -d [DATABASE] -f SQL_CRIAR_CLIENTDATA.sql

# Ou via interface do EasyPanel/PostgreSQL
# Copie e cole o conteúdo do arquivo SQL_CRIAR_CLIENTDATA.sql
```

### Opção 2: Executar SQL Manualmente

Execute este SQL no banco de dados:

```sql
-- Criar tabela clientData
CREATE TABLE IF NOT EXISTS "clientData" (
    id SERIAL PRIMARY KEY,
    "tenantId" INTEGER NOT NULL,
    phone TEXT NOT NULL,
    name TEXT,
    "aiService" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT "clientData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "clientData_tenantId_idx" ON "clientData"("tenantId");
CREATE INDEX IF NOT EXISTS "clientData_phone_idx" ON "clientData"(phone);
CREATE INDEX IF NOT EXISTS "clientData_tenantId_phone_idx" ON "clientData"("tenantId", phone);
```

### Opção 3: Executar Script Completo de Integração

Se você ainda não executou o script completo de integração, execute:

```bash
# Versão sem pgvector (recomendado se não tiver pgvector instalado)
psql -h [HOST] -U [USER] -d [DATABASE] -f SQL_INTEGRAR_TABELAS_TEMPLATE_SEM_VECTOR.sql

# OU versão com pgvector (se tiver pgvector instalado)
psql -h [HOST] -U [USER] -d [DATABASE] -f SQL_INTEGRAR_TABELAS_TEMPLATE.sql
```

## 📋 Verificação

Após executar o script, verifique se a tabela foi criada:

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'clientData';

-- Ver estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clientData'
ORDER BY ordinal_position;
```

## 🔄 Query Corrigida no N8N

A query no N8N está correta, apenas precisa que a tabela exista:

```sql
UPDATE "clientData"
SET "aiService" = 'active',
    "updatedAt" = NOW()
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
  AND phone = '{{ $('Info2').item.json.telefone }}'
RETURNING *;
```

**Importante:** 
- Use aspas duplas `"clientData"` para nomes de tabelas/colunas no PostgreSQL
- Sempre filtre por `tenantId` para isolamento multi-tenant
- O campo `phone` deve corresponder exatamente ao formato do WhatsApp (ex: `5516996480805@s.whatsapp.net`)

## 🎯 Próximos Passos

1. ✅ Execute o script SQL para criar a tabela
2. ✅ Verifique se a tabela foi criada
3. ✅ Teste a query no N8N novamente
4. ✅ Verifique se os dados estão sendo inseridos corretamente

## 📝 Notas

- A tabela `clientData` é compartilhada entre todos os tenants
- O isolamento é feito pelo campo `tenantId` em todas as queries
- Cada tenant só vê seus próprios dados (filtrado por `tenantId`)
- A tabela é criada no banco principal, não em bancos separados por tenant

