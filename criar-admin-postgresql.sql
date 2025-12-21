-- ============================================
-- SCRIPT PARA CRIAR PRIMEIRO ADMIN NO POSTGRESQL
-- Execute este script no seu PostgreSQL após migração
-- ============================================

-- IMPORTANTE: Substitua os valores abaixo pelos seus dados
DO $$
DECLARE
  admin_email VARCHAR := 'fredmazzo@gmail.com';
  admin_name TEXT := 'Frederico Mazzo';
  -- Hash bcrypt para "Admin123!" (gerado automaticamente)
  password_hash TEXT := '$2b$10$T3puHBhdsxcW.NLrYX4I/Ou2OMe8CuNNg4icoQoLOdVwKvjnn7i.6';
  admin_openid VARCHAR := 'admin_' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
  user_exists BOOLEAN;
BEGIN
  -- Verificar se admin já existe
  SELECT EXISTS(SELECT 1 FROM users WHERE email = admin_email AND role = 'admin') INTO user_exists;
  
  IF user_exists THEN
    -- Atualizar admin existente
    UPDATE users 
    SET 
      "passwordHash" = password_hash,
      role = 'admin',
      name = admin_name,
      "updatedAt" = NOW()
    WHERE email = admin_email AND role = 'admin';
    
    RAISE NOTICE 'Admin atualizado com sucesso!';
  ELSE
    -- Inserir novo admin
    INSERT INTO users ("openId", email, name, "passwordHash", role, "createdAt", "updatedAt", "lastSignedIn")
    VALUES (
      admin_openid,
      admin_email,
      admin_name,
      password_hash,
      'admin',
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Admin criado com sucesso!';
  END IF;
  
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Senha: Admin123!';
END $$;

-- Verificar se foi criado
SELECT 
  id, 
  email, 
  name, 
  role, 
  CASE 
    WHEN "passwordHash" IS NOT NULL THEN 'Senha definida' 
    ELSE 'Sem senha' 
  END as senha_status,
  "createdAt"
FROM users 
WHERE email = 'fredmazzo@gmail.com' AND role = 'admin';

-- ============================================
-- CREDENCIAIS PADRÃO:
-- Email: fredmazzo@gmail.com
-- Senha: Admin123!
-- ============================================
-- 
-- Para gerar seu próprio hash bcrypt:
-- 1. https://bcrypt-generator.com/
-- 2. Ou no Node.js: bcrypt.hashSync('sua_senha', 10)
-- ============================================

