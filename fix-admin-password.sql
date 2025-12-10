-- Script para corrigir senha do admin
-- Execute este SQL no banco de dados

-- Opção 1: Atualizar hash existente (se usuário já existe)
UPDATE users 
SET 
  passwordHash = '$2b$10$N2/nZJKryiEVjntkHzNQwOnqCyhFvtF8F.e.NfqJoPR7floBMgDRO',
  role = 'admin',
  updatedAt = NOW()
WHERE email = 'fredmazzo@gmail.com';

-- Verificar se foi atualizado
SELECT id, email, name, role, 
       CASE 
         WHEN passwordHash IS NULL THEN 'NULL (sem senha)'
         WHEN passwordHash = '' THEN 'VAZIO'
         ELSE 'OK (tem hash)'
       END as senha_status,
       loginMethod
FROM users 
WHERE email = 'fredmazzo@gmail.com';

-- Se não encontrou nenhum registro, criar novo:
-- (Descomente as linhas abaixo se necessário)

/*
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
  '$2b$10$N2/nZJKryiEVjntkHzNQwOnqCyhFvtF8F.e.NfqJoPR7floBMgDRO',
  NOW(),
  NOW(),
  NOW()
);
*/

