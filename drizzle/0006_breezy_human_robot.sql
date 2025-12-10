ALTER TABLE `tenants` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `isActivated` boolean DEFAULT false NOT NULL;