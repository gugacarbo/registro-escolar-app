-- Custom SQL migration file, put your code below! --
ALTER TABLE `staff` ADD `default_role_id` text REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `staff_default_role_idx` ON `staff` (`default_role_id`);
