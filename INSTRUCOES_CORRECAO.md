# ✅ Correções Implementadas

## 🔐 1. LOGIN ADMIN - CORRIGIDO

### O que foi feito:
1. ✅ Adicionado campo `passwordHash` na tabela `users` (schema)
2. ✅ Implementada função `loginAdmin` com bcrypt
3. ✅ Criado endpoint `auth.adminLogin` no router
4. ✅ Criada página de login admin (`/admin/login`)
5. ✅ Criado script SQL para criar primeiro admin (`criar-admin.sql`)

### Como usar:

#### Passo 1: Executar migration (adicionar campo passwordHash)
```sql
ALTER TABLE users ADD COLUMN passwordHash TEXT;
```

#### Passo 2: Criar primeiro admin
Execute o script `criar-admin.sql` no seu banco MySQL. Ele já está configurado com:
- Email: `fredmazzo@gmail.com`
- Senha: `Admin123!`
- Hash bcrypt já gerado

#### Passo 3: Fazer login
1. Acesse `/admin/login`
2. Use: `fredmazzo@gmail.com` / `Admin123!`

---

## 🔘 2. BOTÃO "ATIVAR AGENTE" - SIMPLIFICADO

### O que foi feito:
- ✅ Simplificada lógica de `isConnected` para ser mais confiável
- ✅ Agora verifica apenas: `"open"`, `"connected"`, ou `"CONNECTED"`

### Como testar:
1. Conecte o WhatsApp (escaneie QR Code)
2. Quando status for `"open"`, o botão deve aparecer
3. Clique em "Ativar Agente"
4. O sistema vai chamar o webhook N8N

---

## 📋 PRÓXIMOS PASSOS

### 1. Executar migration no banco
```sql
ALTER TABLE users ADD COLUMN passwordHash TEXT;
```

### 2. Criar admin
Execute `criar-admin.sql` ou use:
```sql
INSERT INTO users (openId, email, name, passwordHash, role, createdAt, updatedAt, lastSignedIn)
VALUES (
  CONCAT('admin_', UNIX_TIMESTAMP()),
  'fredmazzo@gmail.com',
  'Frederico Mazzo',
  '$2b$10$T3puHBhdsxcW.NLrYX4I/Ou2OMe8CuNNg4icoQoLOdVwKvjnn7i.6',
  'admin',
  NOW(),
  NOW(),
  NOW()
);
```

### 3. Fazer redeploy
No EasyPanel, clique em **Redeploy** para aplicar as mudanças.

### 4. Testar
- Acesse `/admin/login`
- Faça login com `fredmazzo@gmail.com` / `Admin123!`
- Verifique se consegue acessar o painel admin
- Teste o botão "Ativar Agente" quando WhatsApp estiver conectado

---

## ⚠️ IMPORTANTE

- O campo `passwordHash` precisa ser adicionado no banco antes de fazer login
- Se já existe um admin no banco, você pode atualizar com:
  ```sql
  UPDATE users 
  SET passwordHash = '$2b$10$T3puHBhdsxcW.NLrYX4I/Ou2OMe8CuNNg4icoQoLOdVwKvjnn7i.6',
      role = 'admin'
  WHERE email = 'fredmazzo@gmail.com';
  ```

---

## 🐛 SE ALGO NÃO FUNCIONAR

1. **Login não funciona:**
   - Verifique se o campo `passwordHash` existe na tabela `users`
   - Verifique se o admin foi criado corretamente
   - Verifique os logs do servidor

2. **Botão não aparece:**
   - Verifique o status do WhatsApp no console do navegador
   - Verifique se o status é exatamente `"open"`, `"connected"`, ou `"CONNECTED"`
   - Adicione logs temporários se necessário

