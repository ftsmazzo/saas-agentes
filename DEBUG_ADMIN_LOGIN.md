# 🔍 Debug Login Admin

## Problema Reportado

Login com `fredmazzo@gmail.com` e senha `Admin123!` retornou erro.

## Possíveis Causas

### 1. Campo `loginMethod` NULL
- ✅ **É normal** - `loginMethod` é opcional e pode ser NULL
- Não afeta o login admin (só é usado para OAuth)

### 2. Possíveis Problemas Reais

#### A) Hash da senha incorreto
- O hash no SQL pode não corresponder à senha "Admin123!"
- **Solução:** Gerar novo hash e atualizar no banco

#### B) Email não encontrado
- Email pode estar diferente no banco (case sensitivity)
- **Solução:** Verificar email exato no banco

#### C) Campo `passwordHash` NULL
- O campo pode não ter sido preenchido
- **Solução:** Verificar se o campo existe e tem valor

#### D) Role não é 'admin'
- Usuário pode ter sido criado com role 'user'
- **Solução:** Verificar e atualizar role

## 🔍 Como Debugar

### 1. Verificar se usuário existe

```sql
SELECT id, email, name, role, passwordHash, loginMethod 
FROM users 
WHERE email = 'fredmazzo@gmail.com';
```

**O que verificar:**
- ✅ `email` está correto?
- ✅ `role` = 'admin'?
- ✅ `passwordHash` não é NULL?
- ⚠️ `loginMethod` pode ser NULL (normal)

### 2. Verificar hash da senha

O hash no script é para "Admin123!":
```
$2b$10$oyhbwIQ/BHSKwg7ttb.sJ.UPH2Bz2tnOLoOalVL6O7ybK53upvANm
```

**Testar se está correto:**
- Acesse: https://bcrypt-generator.com/
- Digite: `Admin123!`
- Compare com o hash no banco

### 3. Verificar logs do servidor

Quando tentar fazer login, verifique os logs do servidor para ver o erro exato.

## 🔧 Soluções

### Solução 1: Recriar Admin com Hash Correto

```sql
-- Deletar admin antigo (se existir)
DELETE FROM users WHERE email = 'fredmazzo@gmail.com';

-- Criar novo com hash correto
INSERT INTO users (
  openId,
  email,
  name,
  role,
  passwordHash,
  createdAt,
  updatedAt,
  lastSignedIn
) VALUES (
  CONCAT('admin_', UNIX_TIMESTAMP(), '_frederico'),
  'fredmazzo@gmail.com',
  'Frederico Mazzo',
  'admin',
  '$2b$10$oyhbwIQ/BHSKwg7ttb.sJ.UPH2Bz2tnOLoOalVL6O7ybK53upvANm',
  NOW(),
  NOW(),
  NOW()
);
```

### Solução 2: Atualizar Hash Existente

```sql
-- Atualizar apenas o hash (se usuário já existe)
UPDATE users 
SET passwordHash = '$2b$10$oyhbwIQ/BHSKwg7ttb.sJ.UPH2Bz2tnOLoOalVL6O7ybK53upvANm'
WHERE email = 'fredmazzo@gmail.com';
```

### Solução 3: Gerar Novo Hash

Se quiser usar outra senha:

1. Acesse: https://bcrypt-generator.com/
2. Digite sua senha
3. Copie o hash gerado
4. Execute:

```sql
UPDATE users 
SET passwordHash = 'SEU_NOVO_HASH_AQUI'
WHERE email = 'fredmazzo@gmail.com';
```

## 🔄 Como Reverter

### Se algo der errado:

1. **Deletar usuário admin:**
```sql
DELETE FROM users WHERE email = 'fredmazzo@gmail.com';
```

2. **Ou apenas remover senha (voltar para OAuth):**
```sql
UPDATE users 
SET passwordHash = NULL 
WHERE email = 'fredmazzo@gmail.com';
```

3. **Verificar se sistema ainda funciona:**
- Login de clientes deve continuar funcionando
- OAuth (se configurado) deve continuar funcionando
- Apenas login admin será afetado

## ✅ Checklist de Verificação

- [ ] Usuário existe no banco?
- [ ] Email está correto (case-sensitive)?
- [ ] Role = 'admin'?
- [ ] passwordHash não é NULL?
- [ ] Hash corresponde à senha "Admin123!"?
- [ ] Campo passwordHash existe na tabela? (migration executada?)

## 🚨 Se Nada Funcionar

Podemos criar um script Node.js temporário para criar o admin diretamente:

```javascript
// create-admin-script.js
import bcrypt from 'bcryptjs';
import { getDb } from './server/db.js';

const hash = await bcrypt.hash('Admin123!', 10);
console.log('Hash gerado:', hash);

// Inserir no banco...
```

