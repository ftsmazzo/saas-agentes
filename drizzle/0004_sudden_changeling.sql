ALTER TABLE `platformLogs` MODIFY COLUMN `eventType` enum('tenant_created','tenant_suspended','tenant_deleted','payment_success','payment_failed','usage_limit_reached','workflow_provisioned','workflow_failed','db_provisioned','db_failed','evolution_provisioned','evolution_failed') NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `evolutionInstanceName` varchar(100);--> statement-breakpoint
ALTER TABLE `tenants` ADD `evolutionApiKey` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `chatwootInboxId` int;