CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`conversationId` int NOT NULL,
	`contactId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`mediaType` enum('text','audio','image','document') DEFAULT 'text',
	`mediaUrl` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`isActive` boolean DEFAULT true,
	`lastInteraction` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`contactId` int NOT NULL,
	`status` enum('active','paused','closed') NOT NULL DEFAULT 'active',
	`aiPaused` boolean DEFAULT false,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageAt` timestamp,
	`closedAt` timestamp,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
