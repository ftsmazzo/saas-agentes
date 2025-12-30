# 🔧 Correção: Erro contactId NULL na tabela conversations

## ❌ Erro Identificado

```
null value in column "contactId" of relation "conversations" violates not-null constraint
```

## 🔍 Causa do Problema

A tabela `conversations` **requer** o campo `contactId` (NOT NULL), mas a query atual no node "Adiciona CHAT supabase" **não está incluindo** esse campo.

### Query Atual (INCORRETA):

```sql
INSERT INTO conversations ("tenantId", phone, "updatedAt", "startedAt")
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  '{{ $('Info2').item.json.telefone }}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING *;
```

**Problema:** Não inclui `contactId`, que é obrigatório!

---

## ✅ Solução: Incluir contactId na Query

### Opção 1: Buscar/Criar Contato na Mesma Query (RECOMENDADO)

Use esta query que busca o contato existente ou cria um novo se não existir:

```sql
INSERT INTO conversations (
  "tenantId",
  "contactId",
  phone,
  "updatedAt",
  "startedAt"
)
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  (
    -- Buscar contato existente ou criar novo
    SELECT id FROM contacts
    WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
      AND "phoneNumber" = '{{ $('Info2').item.json.telefone }}'
    LIMIT 1
    
    UNION ALL
    
    -- Se não existir, criar novo contato
    SELECT id FROM (
      INSERT INTO contacts ("tenantId", "phoneNumber", name, "isActive", "createdAt", "updatedAt")
      VALUES (
        {{ $('Edit Fields2').item.json.tenantId }},
        '{{ $('Info2').item.json.telefone }}',
        '{{ $('Info2').item.json.NomeWhatsapp }}',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    ) AS new_contact
    WHERE NOT EXISTS (
      SELECT 1 FROM contacts
      WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
        AND "phoneNumber" = '{{ $('Info2').item.json.telefone }}'
    )
    LIMIT 1
  ),
  '{{ $('Info2').item.json.telefone }}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING *;
```

**⚠️ ATENÇÃO:** A query acima pode ser complexa. Use a **Opção 2** que é mais simples e confiável.

---

### Opção 2: Usar Subquery Simples (MAIS SIMPLES E RECOMENDADO)

Esta query busca o contato existente. Se não existir, você precisa criar o contato antes:

```sql
INSERT INTO conversations (
  "tenantId",
  "contactId",
  phone,
  "updatedAt",
  "startedAt"
)
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  (
    SELECT id FROM contacts
    WHERE "tenantId" = {{ $('Edit Fields2').item.json.tenantId }}
      AND "phoneNumber" = '{{ $('Info2').item.json.telefone }}'
    LIMIT 1
  ),
  '{{ $('Info2').item.json.telefone }}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING *;
```

**Mas isso ainda pode falhar se o contato não existir!**

---

### Opção 3: Criar Contato Primeiro (MELHOR SOLUÇÃO)

**Passo 1:** Adicione um node PostgreSQL ANTES de "Adiciona CHAT supabase" para garantir que o contato existe:

**Node:** "Criar/Buscar Contato" (novo node)

**Query:**
```sql
INSERT INTO contacts ("tenantId", "phoneNumber", name, "isActive", "createdAt", "updatedAt")
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  '{{ $('Info2').item.json.telefone }}',
  '{{ $('Info2').item.json.NomeWhatsapp }}',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("tenantId", "phoneNumber") 
DO UPDATE SET 
  name = EXCLUDED.name,
  "updatedAt" = NOW()
RETURNING id;
```

**Passo 2:** Modifique o node "Adiciona CHAT supabase" para usar o contactId:

**Query Corrigida:**
```sql
INSERT INTO conversations (
  "tenantId",
  "contactId",
  phone,
  "updatedAt",
  "startedAt"
)
VALUES (
  {{ $('Edit Fields2').item.json.tenantId }},
  {{ $('Criar/Buscar Contato').item.json.id }},
  '{{ $('Info2').item.json.telefone }}',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING *;
```

---

## 🎯 Solução Recomendada: Query com CTE (Common Table Expression)

Esta é a **melhor solução** - cria o contato se não existir e usa o ID na conversa:

```sql
WITH contact AS (
  -- Buscar ou criar contato
  INSERT INTO contacts ("tenantId", "phoneNumber", name, "isActive", "createdAt", "updatedAt")
  VALUES (
    {{ $('Edit Fields2').item.json.tenantId }},
    '{{ $('Info2').item.json.telefone }}',
    '{{ $('Info2').item.json.NomeWhatsapp }}',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT ("tenantId", "phoneNumber") 
  DO UPDATE SET 
    name = EXCLUDED.name,
    "updatedAt" = NOW()
  RETURNING id
)
INSERT INTO conversations (
  "tenantId",
  "contactId",
  phone,
  "updatedAt",
  "startedAt"
)
SELECT 
  {{ $('Edit Fields2').item.json.tenantId }},
  contact.id,
  '{{ $('Info2').item.json.telefone }}',
  NOW(),
  NOW()
FROM contact
ON CONFLICT DO NOTHING
RETURNING *;
```

**⚠️ ATENÇÃO:** Esta query requer que a tabela `contacts` tenha uma constraint UNIQUE em `("tenantId", "phoneNumber")`. Se não tiver, use a **Opção 3** (criar node separado).

---

## 🔧 Como Aplicar a Correção

### Passo 1: Verificar Constraint na Tabela contacts

Execute esta query no PostgreSQL para verificar se existe constraint UNIQUE:

```sql
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'contacts'
  AND constraint_type = 'UNIQUE';
```

Se **NÃO existir**, você precisa criar:

```sql
ALTER TABLE contacts
ADD CONSTRAINT contacts_tenant_phone_unique 
UNIQUE ("tenantId", "phoneNumber");
```

### Passo 2: Atualizar Node "Adiciona CHAT supabase"

1. Abra o node "Adiciona CHAT supabase"
2. Vá para a query SQL
3. **Substitua** a query atual pela **query com CTE** acima (ou Opção 3 se preferir)
4. Salve o node

### Passo 3: Testar

Execute o workflow e verifique:
- ✅ O contato é criado/buscado corretamente
- ✅ A conversa é criada com `contactId` válido
- ✅ Não há mais erro de NULL constraint

---

## 📊 Fluxo Recomendado

### Opção A: Query Única (se tiver UNIQUE constraint)

```
If4 (verifica se conversa existe)
  ↓
[NOVO] Criar/Buscar Contato (CTE na query)
  ↓
Adiciona CHAT supabase (usa contactId do CTE)
```

### Opção B: Dois Nodes (mais seguro)

```
If4 (verifica se conversa existe)
  ↓
[NOVO] Criar/Buscar Contato (node separado)
  ↓
Adiciona CHAT supabase (usa contactId do node anterior)
```

---

## ✅ Checklist

Após aplicar a correção:

- [ ] Verificar se constraint UNIQUE existe em `contacts("tenantId", "phoneNumber")`
- [ ] Criar constraint se não existir
- [ ] Atualizar query do node "Adiciona CHAT supabase"
- [ ] Testar criação de conversa nova
- [ ] Testar quando contato já existe
- [ ] Verificar que `contactId` não é mais NULL

---

**Aplique a correção e teste! 🚀**

