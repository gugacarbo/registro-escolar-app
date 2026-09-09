CREATE TABLE `meeting_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`class_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meeting_classes_meeting_class_uidx` ON `meeting_classes` (`meeting_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `meeting_classes_meeting_idx` ON `meeting_classes` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `meeting_classes_class_idx` ON `meeting_classes` (`class_id`);--> statement-breakpoint
ALTER TABLE `meetings` ADD `template_id` text;