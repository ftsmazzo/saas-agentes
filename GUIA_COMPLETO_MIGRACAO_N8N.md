# 🔧 Guia Completo de Migração N8N - tenantId → agentId

## ⚠️ PROBLEMA IDENTIFICADO

Após a migração do banco de dados, a tabela `agentConfigs` agora usa `agentId` em vez de `tenantId`. 

**Todas as queries do N8N que acessam `agentConfigs` usando `tenantId` precisam ser atualizadas!**

---

## 📋 QUERIES QUE PRECISAM SER CORRIGIDAS

### 1. ❌ QUERY ERRADA (Atual)
```sql
SELECT 
  "systemPrompt",
  "companyInfo",
  "welcomeMessage",
  "toolsConfig",
  "ragConfig"
FROM "agentConfigs"
WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
LIMIT 1;
```

### 2. ✅ QUERY CORRIGIDA (Opção 1 - Usando JOIN)
```sql
SELECT 
  ac."systemPrompt",
  ac."companyInfo",
  ac."welcomeMessage",
  ac."toolsConfig",
  ac."ragConfig"
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
LIMIT 1;
```

### 3. ✅ QUERY CORRIGIDA (Opção 2 - Se tiver agentId)
```sql
SELECT 
  "systemPrompt",
  "companyInfo",
  "welcomeMessage",
  "toolsConfig",
  "ragConfig"
FROM "agentConfigs"
WHERE "agentId" = {{ $agentId }}
LIMIT 1;
```

---

## 🔍 COMO ENCONTRAR O agentId A PARTIR DO tenantId

Se você só tem `tenantId` e precisa do `agentId`, use esta query primeiro:

```sql
SELECT id as "agentId"
FROM "agents"
WHERE "tenantId" = {{ $tenantId }}
ORDER BY "createdAt" ASC
LIMIT 1;
```

Depois use o `agentId` retornado na query de `agentConfigs`.

---

## 📝 OUTRAS QUERIES COMUNS QUE PRECISAM SER CORRIGIDAS

### Buscar todas as configurações de um tenant
```sql
-- ❌ ERRADO
SELECT * FROM "agentConfigs" WHERE "tenantId" = {{ $tenantId }};

-- ✅ CORRETO
SELECT ac.*
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $tenantId }};
```

### Atualizar configuração por tenantId
```sql
-- ❌ ERRADO
UPDATE "agentConfigs"
SET "systemPrompt" = {{ $systemPrompt }}
WHERE "tenantId" = {{ $tenantId }};

-- ✅ CORRETO
UPDATE "agentConfigs" ac
SET "systemPrompt" = {{ $systemPrompt }},
    "updatedAt" = NOW()
FROM "agents" a
WHERE ac."agentId" = a.id
  AND a."tenantId" = {{ $tenantId }};
```

### Verificar se configuração existe
```sql
-- ❌ ERRADO
SELECT COUNT(*) FROM "agentConfigs" WHERE "tenantId" = {{ $tenantId }};

-- ✅ CORRETO
SELECT COUNT(*)
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $tenantId }};
```

---

## 🎯 RECOMENDAÇÃO FINAL

**Sempre que possível, busque o `agentId` primeiro e use diretamente:**

1. **Node 1: Buscar agentId**
```sql
SELECT id as "agentId"
FROM "agents"
WHERE "tenantId" = {{ $tenantId }}
ORDER BY "createdAt" ASC
LIMIT 1;
```

2. **Node 2: Buscar configuração usando agentId**
```sql
SELECT *
FROM "agentConfigs"
WHERE "agentId" = {{ $('Node 1').item.json.agentId }}
LIMIT 1;
```

Isso é mais eficiente e evita JOINs desnecessários.

---

## ⚠️ IMPORTANTE

Após executar a migration `0013_migrate_agentConfigs_to_agentId.sql`, a coluna `tenantId` será **removida** da tabela `agentConfigs`.

**Todas as queries que ainda usam `tenantId` diretamente em `agentConfigs` vão falhar!**

---

## 📋 CHECKLIST DE ATUALIZAÇÃO

- [ ] Node "Buscar Configurações Agente" - ✅ Query corrigida acima
- [ ] Node "Atualizar Configurações" (se existir)
- [ ] Node "Verificar Configuração" (se existir)
- [ ] Qualquer outro node que acesse `agentConfigs`

---

## 🔧 COMO ATUALIZAR NO N8N

1. Abra o workflow no N8N
2. Encontre o node "Buscar Configurações Agente" (ou similar)
3. Edite a query SQL
4. Substitua pela query corrigida
5. Salve o workflow
6. Publique o workflow

---

**Data de atualização:** 2026-01-06

