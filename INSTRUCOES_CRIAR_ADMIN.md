# 👤 Criar Primeiro Admin - Frederico Mazzo

## 📋 Dados do Admin

- **Nome:** Frederico Mazzo
- **Email:** fredmazzo@gmail.com
- **Senha padrão:** `Admin123!` (mude depois do primeiro login!)

## 🚀 Como Criar

### Opção 1: Via EasyPanel (Recomendado)

1. Acesse o **phpMyAdmin** no EasyPanel
2. Selecione o banco de dados `saas_agentes`
3. Vá na aba **SQL**
4. Cole e execute o conteúdo do arquivo `create-admin-frederico.sql`

### Opção 2: Via Terminal MySQL

```bash
# Conecte ao MySQL
mysql -u saas_agentes -p saas_agentes

# Execute o script
source create-admin-frederico.sql
```

### Opção 3: Copiar e Colar Direto

Execute este SQL no seu banco:

```sql
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

## ✅ Verificar se Foi Criado

Execute esta query:

```sql
SELECT id, email, name, role, createdAt 
FROM users 
WHERE email = 'fredmazzo@gmail.com';
```

Deve retornar 1 linha com:
- `email`: fredmazzo@gmail.com
- `name`: Frederico Mazzo
- `role`: admin

## 🔐 Primeiro Login

1. Acesse: `https://saas.fabricadosdados.com.br/admin/login`
2. Email: `fredmazzo@gmail.com`
3. Senha: `Admin123!`
4. **IMPORTANTE:** Após fazer login, altere a senha imediatamente!

## 🔄 Alterar Senha (Depois do Login)

Por enquanto, você precisará alterar a senha diretamente no banco. Vou criar uma funcionalidade para isso no painel depois.

Para alterar a senha no banco:

1. Gere um novo hash em: https://bcrypt-generator.com/
2. Execute:
```sql
UPDATE users 
SET passwordHash = 'SEU_NOVO_HASH_AQUI' 
WHERE email = 'fredmazzo@gmail.com';
```

---

**Pronto!** Após executar o script, você poderá fazer login no painel admin! 🎉

