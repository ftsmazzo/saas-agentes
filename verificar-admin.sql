-- Script para verificar status do admin no banco
-- Execute este SQL para debugar o problema

-- 1. Verificar se usuário existe e seus dados
SELECT 
  id,
  email,
  name,
  role,
  CASE 
    WHEN passwordHash IS NULL THEN '❌ NULL (sem senha)'
    WHEN passwordHash = '' THEN '❌ VAZIO'
    ELSE CONCAT('✅ OK (', LENGTH(passwordHash), ' caracteres)')
  END as senha_status,
  loginMethod as login_method,
  createdAt,
  updatedAt
FROM users 
WHERE email = 'fredmazzo@gmail.com' 
   OR email LIKE '%fredmazzo%';

-- 2. Verificar se campo passwordHash existe na tabela
DESCRIBE users;

-- 3. Verificar todos os admins
SELECT 
  id,
  email,
  name,
  role,
  CASE 
    WHEN passwordHash IS NULL THEN 'SEM SENHA'
    ELSE 'COM SENHA'
  END as tem_senha
FROM users 
WHERE role = 'admin';

