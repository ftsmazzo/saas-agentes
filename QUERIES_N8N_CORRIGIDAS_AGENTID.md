# 🔧 Queries N8N Corrigidas - Migração tenantId → agentId

## ⚠️ PROBLEMA

A tabela `agentConfigs` foi migrada de `tenantId` para `agentId`. Todas as queries do N8N que usam `tenantId` precisam ser atualizadas.

---

## ✅ QUERY CORRIGIDA

### ANTES (❌ ERRADO):
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

### DEPOIS (✅ CORRETO):
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

**OU** (se você tiver o `agentId` diretamente):
```sql
SELECT 
  "systemPrompt",
  "companyInfo",
  "welcomeMessage",
  "toolsConfig",
  "ragConfig"
FROM "agentConfigs"
WHERE "agentId" = {{ $('Edit Fields2').item.json.agentId }}
LIMIT 1;
```

---

## 📋 OUTRAS QUERIES QUE PODEM PRECISAR DE CORREÇÃO

### 1. Buscar configuração por tenantId (usando JOIN)
```sql
SELECT 
  ac.*
FROM "agentConfigs" ac
INNER JOIN "agents" a ON ac."agentId" = a.id
WHERE a."tenantId" = {{ $tenantId }}
LIMIT 1;
```

### 2. Buscar configuração por agentId (direto)
```sql
SELECT 
  *
FROM "agentConfigs"
WHERE "agentId" = {{ $agentId }}
LIMIT 1;
```

### 3. Atualizar configuração por tenantId
```sql
UPDATE "agentConfigs" ac
SET 
  "systemPrompt" = {{ $systemPrompt }},
  "companyInfo" = {{ $companyInfo }},
  "welcomeMessage" = {{ $welcomeMessage }},
  "updatedAt" = NOW()
FROM "agents" a
WHERE ac."agentId" = a.id
  AND a."tenantId" = {{ $tenantId }};
```

### 4. Atualizar configuração por agentId (direto)
```sql
UPDATE "agentConfigs"
SET 
  "systemPrompt" = {{ $systemPrompt }},
  "companyInfo" = {{ $companyInfo }},
  "welcomeMessage" = {{ $welcomeMessage }},
  "updatedAt" = NOW()
WHERE "agentId" = {{ $agentId }};
```

---

## 🎯 RECOMENDAÇÃO

**Sempre que possível, use `agentId` diretamente** em vez de `tenantId` com JOIN. É mais eficiente e direto.

Se você só tem `tenantId` disponível, use o JOIN com a tabela `agents`.

---

## 🔍 COMO ENCONTRAR TODAS AS QUERIES NO N8N

1. Abra o workflow no N8N
2. Procure por nodes do tipo "Postgres" ou "MySQL"
3. Verifique cada query que menciona `agentConfigs`
4. Substitua todas as referências a `tenantId` em `agentConfigs`

---

## 📝 CHECKLIST DE ATUALIZAÇÃO

- [ ] Node "Buscar Configurações Agente" - ✅ Corrigido acima
- [ ] Node "Atualizar Configurações" (se existir)
- [ ] Node "Verificar Configuração" (se existir)
- [ ] Qualquer outro node que acesse `agentConfigs`

---

## ⚠️ IMPORTANTE

Após executar a migration `0013_migrate_agentConfigs_to_agentId.sql`, a coluna `tenantId` será **removida** da tabela `agentConfigs`. 

Todas as queries que ainda usam `tenantId` diretamente em `agentConfigs` vão falhar!

---

**Data de atualização:** 2026-01-06

