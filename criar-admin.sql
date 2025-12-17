-- ============================================
-- SCRIPT PARA CRIAR PRIMEIRO ADMIN
-- Execute este script no seu banco MySQL
-- ============================================

-- IMPORTANTE: Substitua os valores abaixo pelos seus dados
SET @admin_email = 'fredmazzo@gmail.com';
SET @admin_name = 'Frederico Mazzo';
SET @admin_password = 'Admin123!'; -- Senha que você quer usar

-- Hash bcrypt para "Admin123!" (gerado automaticamente)
SET @password_hash = '$2b$10$T3puHBhdsxcW.NLrYX4I/Ou2OMe8CuNNg4icoQoLOdVwKvjnn7i.6';

-- Opção 1: Inserir novo admin (se não existe)
INSERT INTO users (openId, email, name, passwordHash, role, createdAt, updatedAt, lastSignedIn)
VALUES (
  CONCAT('admin_', UNIX_TIMESTAMP()), -- openId único
  @admin_email,
  @admin_name,
  @password_hash,
  'admin',
  NOW(),
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  passwordHash = @password_hash,
  role = 'admin',
  updatedAt = NOW();

-- Opção 2: Atualizar admin existente (se já existe)
-- UPDATE users 
-- SET passwordHash = @password_hash,
--     role = 'admin',
--     email = @admin_email,
--     name = @admin_name,
--     updatedAt = NOW()
-- WHERE email = @admin_email;

-- Verificar se foi criado
SELECT id, email, name, role, 
       CASE WHEN passwordHash IS NOT NULL THEN 'Senha definida' ELSE 'Sem senha' END as senha_status
FROM users 
WHERE email = @admin_email AND role = 'admin';

-- ============================================
-- NOTA: O hash acima é um exemplo
-- Para gerar seu próprio hash, use:
-- 1. https://bcrypt-generator.com/
-- 2. Ou no Node.js: bcrypt.hashSync('Admin123!', 10)
-- ============================================

