-- Script para criar primeiro usuário admin
-- Execute este script no seu banco de dados MySQL

-- IMPORTANTE: Substitua 'seu-email@exemplo.com' e 'SuaSenhaSegura123!' pelos valores desejados
-- A senha será hasheada usando bcrypt

-- Exemplo de uso:
-- 1. Gere um hash bcrypt da senha (pode usar: https://bcrypt-generator.com/)
-- 2. Substitua o hash abaixo pelo hash gerado
-- 3. Execute o script

-- Para gerar hash bcrypt online:
-- - Vá para: https://bcrypt-generator.com/
-- - Digite sua senha
-- - Copie o hash gerado
-- - Cole no campo passwordHash abaixo

-- Exemplo de hash bcrypt para senha "admin123":
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

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
  CONCAT('admin_', UNIX_TIMESTAMP()), -- openId único
  'admin@fabricadosdados.com.br', -- ALTERE AQUI: seu email
  'Administrador', -- ALTERE AQUI: seu nome
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- ALTERE AQUI: hash bcrypt da sua senha
  NOW(),
  NOW(),
  NOW()
);

-- Para verificar se foi criado:
-- SELECT id, email, name, role FROM users WHERE role = 'admin';

-- NOTA: A senha padrão do exemplo acima é "admin123"
-- ALTERE O HASH ANTES DE EXECUTAR EM PRODUÇÃO!

