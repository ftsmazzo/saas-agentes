-- Migration: Adicionar campo passwordHash na tabela users
-- Execute este script no seu banco de dados MySQL

ALTER TABLE users 
ADD COLUMN passwordHash TEXT NULL AFTER loginMethod;

-- Verificar se foi adicionado:
-- DESCRIBE users;

