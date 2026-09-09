CREATE TABLE `general_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`origin_id` text,
	`category_id` text,
	`texto` text NOT NULL,
	`include_in_minutes` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`origin_id`) REFERENCES `meeting_participants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `general_reports_meeting_idx` ON `general_reports` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `general_reports_meeting_minutes_idx` ON `general_reports` (`meeting_id`,`include_in_minutes`);--> statement-breakpoint
CREATE INDEX `general_reports_origin_idx` ON `general_reports` (`origin_id`);