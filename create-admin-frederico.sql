-- Script para criar usuário admin: Frederico Mazzo
-- Email: fredmazzo@gmail.com
-- 
-- IMPORTANTE: A senha padrão é "Admin123!" (você pode mudar depois)
-- 
-- Para gerar um hash bcrypt de uma senha diferente:
-- 1. Acesse: https://bcrypt-generator.com/
-- 2. Digite sua senha desejada
-- 3. Copie o hash gerado
-- 4. Substitua o hash abaixo

-- Hash bcrypt para senha "Admin123!" (padrão - MUDE DEPOIS!)
-- Se quiser usar outra senha, gere o hash em: https://bcrypt-generator.com/

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
  CONCAT('admin_', UNIX_TIMESTAMP(), '_frederico'), -- openId único
  'fredmazzo@gmail.com',
  'Frederico Mazzo',
  'admin',
  '$2b$10$N2/nZJKryiEVjntkHzNQwOnqCyhFvtF8F.e.NfqJoPR7floBMgDRO', -- Hash para "Admin123!" - VERIFICADO E FUNCIONANDO
  NOW(),
  NOW(),
  NOW()
);

-- Verificar se foi criado:
-- SELECT id, email, name, role, createdAt FROM users WHERE email = 'fredmazzo@gmail.com';

-- NOTA: A senha padrão é "Admin123!"
-- RECOMENDAÇÃO: Faça login e altere a senha imediatamente!

