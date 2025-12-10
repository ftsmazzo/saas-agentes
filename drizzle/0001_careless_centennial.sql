CREATE TABLE `agentConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`systemPrompt` text,
	`companyInfo` text,
	`welcomeMessage` text,
	`enableHumanHandoff` boolean DEFAULT true,
	`enableAudioTranscription` boolean DEFAULT true,
	`enableImageProcessing` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `agentConfigs_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`stripePriceId` varchar(100) NOT NULL,
	`priceMonthly` int NOT NULL,
	`maxWorkflowExecutions` int DEFAULT 1000,
	`maxConversations` int DEFAULT 10000,
	`maxStorageGB` int DEFAULT 5,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`eventType` enum('tenant_created','tenant_suspended','tenant_deleted','payment_success','payment_failed','usage_limit_reached','workflow_provisioned','workflow_failed','db_provisioned','db_failed') NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platformLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`subdomain` varchar(100),
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`n8nWorkflowId` varchar(100),
	`dbHost` varchar(255),
	`dbPort` int,
	`dbName` varchar(100),
	`dbUser` varchar(100),
	`dbPassword` text,
	`stripeCustomerId` varchar(100),
	`stripeSubscriptionId` varchar(100),
	`subscriptionStatus` enum('active','past_due','canceled','incomplete','trialing'),
	`currentPlanId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_subdomain_unique` UNIQUE(`subdomain`)
);
--> statement-breakpoint
CREATE TABLE `usageMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`workflowExecutions` int DEFAULT 0,
	`totalConversations` int DEFAULT 0,
	`totalMessages` int DEFAULT 0,
	`apiCallsOpenAI` int DEFAULT 0,
	`storageUsedMB` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usageMetrics_id` PRIMARY KEY(`id`)
);
