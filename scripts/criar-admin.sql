-- ============================================
-- SCRIPT PARA CRIAR PRIMEIRO ADMIN
-- ============================================
-- Execute este script no PgAdmin para criar o primeiro usuário admin
-- ============================================

-- IMPORTANTE: Gere o hash da senha usando Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('SUA_SENHA', 10).then(hash => console.log(hash));"
-- 
-- Ou use este hash de exemplo para senha "admin123":
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Criar usuário admin
-- ALTERE: email e passwordHash antes de executar!

INSERT INTO "users" (
  "openId",
  "email",
  "name",
  "role",
  "passwordHash",
  "loginMethod"
)
VALUES (
  'admin_' || gen_random_uuid()::text,
  'admin@example.com',  -- ⚠️ ALTERE PARA SEU EMAIL
  'Administrador',
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- Hash de "admin123" - ⚠️ ALTERE DEPOIS!
  'password'
)
ON CONFLICT DO NOTHING;

-- Verificar se foi criado
SELECT 
  id,
  email,
  name,
  role,
  "createdAt"
FROM "users"
WHERE role = 'admin';

-- ============================================
-- NOTA: A senha padrão é "admin123"
-- ALTERE A SENHA DEPOIS DO PRIMEIRO LOGIN!
-- ============================================

