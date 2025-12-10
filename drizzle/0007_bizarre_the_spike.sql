CREATE TABLE `activationTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activationTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `activationTokens_token_unique` UNIQUE(`token`)
);
