CREATE TABLE `minute_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`header_text` text DEFAULT '' NOT NULL,
	`footer_text` text DEFAULT '' NOT NULL,
	`show_meeting` integer DEFAULT true NOT NULL,
	`show_classes` integer DEFAULT true NOT NULL,
	`show_participants` integer DEFAULT true NOT NULL,
	`show_records` integer DEFAULT true NOT NULL,
	`show_general_reports` integer DEFAULT true NOT NULL,
	`show_signatures` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `minute_templates_name_idx` ON `minute_templates` (`name`);--> statement-breakpoint
CREATE TABLE `minute_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`minute_id` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`pdf` blob,
	`is_current` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`minute_id`) REFERENCES `minutes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `minute_versions_minute_version_uidx` ON `minute_versions` (`minute_id`,`version`);--> statement-breakpoint
CREATE INDEX `minute_versions_minute_idx` ON `minute_versions` (`minute_id`);--> statement-breakpoint
CREATE INDEX `minute_versions_minute_current_idx` ON `minute_versions` (`minute_id`,`is_current`);--> statement-breakpoint
CREATE TABLE `minutes` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`template_id` text,
	`approval_status` text DEFAULT 'pendente_aprovacao' NOT NULL,
	`approved_at` integer,
	`approval_notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `minute_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `minutes_meeting_uidx` ON `minutes` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `minutes_approval_status_idx` ON `minutes` (`approval_status`);