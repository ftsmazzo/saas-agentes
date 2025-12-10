-- ============================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS
-- SaaS de Agentes - MySQL
-- ============================================
-- Execute este script no seu banco MySQL do EasyPanel
-- ============================================

-- Criar banco de dados (se não existir)
-- CREATE DATABASE IF NOT EXISTS saas_agentes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE saas_agentes;

-- ============================================
-- TABELA: users (Usuários - Admin)
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320) DEFAULT NULL,
  `loginMethod` varchar(64) DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `openId` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: plans (Planos de Assinatura)
-- ============================================
CREATE TABLE IF NOT EXISTS `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `stripePriceId` varchar(100) NOT NULL,
  `priceMonthly` int NOT NULL COMMENT 'Preço em centavos',
  `maxWorkflowExecutions` int DEFAULT 1000,
  `maxConversations` int DEFAULT 10000,
  `maxStorageGB` int DEFAULT 5,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: tenants (Clientes/Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerId` int NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `subdomain` varchar(100) DEFAULT NULL,
  `status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
  `passwordHash` text,
  `isActivated` tinyint(1) NOT NULL DEFAULT 0,
  `n8nWorkflowId` varchar(100) DEFAULT NULL,
  `evolutionInstanceName` varchar(100) DEFAULT NULL,
  `evolutionApiKey` text,
  `chatwootInboxId` int DEFAULT NULL,
  `dbHost` varchar(255) DEFAULT NULL,
  `dbPort` int DEFAULT NULL,
  `dbName` varchar(100) DEFAULT NULL,
  `dbUser` varchar(100) DEFAULT NULL,
  `dbPassword` text,
  `stripeCustomerId` varchar(100) DEFAULT NULL,
  `stripeSubscriptionId` varchar(100) DEFAULT NULL,
  `subscriptionStatus` enum('active','past_due','canceled','incomplete','trialing') DEFAULT NULL,
  `currentPlanId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subdomain` (`subdomain`),
  KEY `ownerId` (`ownerId`),
  KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: agentConfigs (Configurações do Agente)
-- ============================================
CREATE TABLE IF NOT EXISTS `agentConfigs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `systemPrompt` text,
  `companyInfo` text,
  `welcomeMessage` text,
  `enableHumanHandoff` tinyint(1) DEFAULT 1,
  `enableAudioTranscription` tinyint(1) DEFAULT 1,
  `enableImageProcessing` tinyint(1) DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: usageMetrics (Métricas de Uso)
-- ============================================
CREATE TABLE IF NOT EXISTS `usageMetrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `periodStart` timestamp NOT NULL,
  `periodEnd` timestamp NOT NULL,
  `workflowExecutions` int DEFAULT 0,
  `totalConversations` int DEFAULT 0,
  `totalMessages` int DEFAULT 0,
  `apiCallsOpenAI` int DEFAULT 0,
  `storageUsedMB` int DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: platformLogs (Logs da Plataforma)
-- ============================================
CREATE TABLE IF NOT EXISTS `platformLogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int DEFAULT NULL,
  `eventType` enum('tenant_created','tenant_activated','tenant_suspended','tenant_deleted','payment_success','payment_failed','usage_limit_reached','workflow_provisioned','workflow_failed','db_provisioned','db_failed','evolution_provisioned','evolution_failed','config_updated','provisioning_failed','n8n_failed','email_failed') NOT NULL,
  `severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
  `message` text NOT NULL,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`),
  KEY `eventType` (`eventType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: system_config (Configurações do Sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `configKey` varchar(100) NOT NULL,
  `configValue` text,
  `isEncrypted` tinyint(1) NOT NULL DEFAULT 0,
  `description` text,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `configKey` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: contacts (Contatos)
-- ============================================
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `phoneNumber` varchar(20) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `lastInteraction` timestamp NULL DEFAULT NULL,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: conversations (Conversas)
-- ============================================
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `contactId` int NOT NULL,
  `status` enum('active','paused','closed') NOT NULL DEFAULT 'active',
  `aiPaused` tinyint(1) DEFAULT 0,
  `startedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastMessageAt` timestamp NULL DEFAULT NULL,
  `closedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`),
  KEY `contactId` (`contactId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: chatMessages (Mensagens)
-- ============================================
CREATE TABLE IF NOT EXISTS `chatMessages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `conversationId` int NOT NULL,
  `contactId` int NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` text NOT NULL,
  `mediaType` enum('text','audio','image','document') DEFAULT 'text',
  `mediaUrl` text,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`),
  KEY `conversationId` (`conversationId`),
  KEY `contactId` (`contactId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: activationTokens (Tokens de Ativação)
-- ============================================
CREATE TABLE IF NOT EXISTS `activationTokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenantId` (`tenantId`),
  UNIQUE KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERIR PLANOS DE TESTE
-- ============================================
INSERT INTO `plans` (`name`, `description`, `stripePriceId`, `priceMonthly`, `maxWorkflowExecutions`, `maxConversations`, `maxStorageGB`, `isActive`) VALUES
('Plano Básico', 'Ideal para começar', 'price_test_basic', 9900, 1000, 500, 5, 1),
('Plano Pro', 'Para crescer', 'price_test_pro', 19900, 5000, 2000, 20, 1),
('Plano Enterprise', 'Recursos avançados', 'price_test_enterprise', 49900, NULL, NULL, NULL, 1)
ON DUPLICATE KEY UPDATE `name`=`name`;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Após executar, configure o DATABASE_URL no .env:
-- DATABASE_URL=mysql://usuario:senha@host:porta/nome_do_banco
-- ============================================

