# 🔄 Como Reverter Login Admin

## ✅ É Seguro Testar

**SIM, é totalmente reversível!** O sistema de login admin é independente e não afeta:
- ✅ Login de clientes (continua funcionando)
- ✅ OAuth (se estiver configurado, continua funcionando)
- ✅ Outras funcionalidades do sistema

## 🔄 Como Reverter

### Opção 1: Remover Senha (Voltar para OAuth)

```sql
-- Remove senha, mas mantém usuário
UPDATE users 
SET passwordHash = NULL 
WHERE email = 'fredmazzo@gmail.com';
```

Depois disso, você pode usar OAuth (se estiver configurado) ou criar senha novamente.

### Opção 2: Deletar Usuário Admin

```sql
-- Deletar completamente
DELETE FROM users WHERE email = 'fredmazzo@gmail.com';
```

### Opção 3: Reverter Migration (Remover Campo)

Se quiser remover completamente o campo `passwordHash`:

```sql
ALTER TABLE users DROP COLUMN passwordHash;
```

**⚠️ ATENÇÃO:** Isso vai remover todas as senhas de admin. Só faça se tiver certeza!

## 🔍 Diagnóstico do Problema

### Verificar Status Atual

Execute `verificar-admin.sql` para ver:
- Se usuário existe
- Se tem senha configurada
- Se role é 'admin'
- Status do campo passwordHash

### Possíveis Problemas

1. **Campo passwordHash não existe**
   - Solução: Executar migration `migration-add-passwordhash.sql`

2. **passwordHash é NULL**
   - Solução: Executar `fix-admin-password.sql`

3. **Hash incorreto**
   - Solução: Gerar novo hash e atualizar

4. **Email diferente**
   - Solução: Verificar email exato no banco

## 🛠️ Scripts de Correção

1. **`verificar-admin.sql`** - Verifica status atual
2. **`fix-admin-password.sql`** - Corrige senha do admin
3. **`create-admin-frederico.sql`** - Cria admin do zero

## ✅ Teste Seguro

Você pode testar sem medo:
- Se der errado, execute `fix-admin-password.sql`
- Ou simplesmente remova a senha e use OAuth
- Sistema de clientes não será afetado

