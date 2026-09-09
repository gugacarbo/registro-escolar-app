CREATE TABLE `class_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`component_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_offers_class_component_uidx` ON `class_offers` (`class_id`,`component_id`);--> statement-breakpoint
CREATE INDEX `class_offers_class_idx` ON `class_offers` (`class_id`);--> statement-breakpoint
CREATE INDEX `class_offers_component_idx` ON `class_offers` (`component_id`);--> statement-breakpoint
CREATE TABLE `components` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `components_name_idx` ON `components` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `components_name_uidx` ON `components` (`name`);--> statement-breakpoint
CREATE TABLE `offer_professors` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `class_offers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offer_professors_offer_staff_uidx` ON `offer_professors` (`offer_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `offer_professors_offer_idx` ON `offer_professors` (`offer_id`);--> statement-breakpoint
CREATE INDEX `offer_professors_staff_idx` ON `offer_professors` (`staff_id`);--> statement-breakpoint
CREATE TABLE `meeting_student_status` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meeting_student_status_meeting_class_student_uidx` ON `meeting_student_status` (`meeting_id`,`class_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `meeting_student_status_meeting_class_idx` ON `meeting_student_status` (`meeting_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `meeting_student_status_meeting_student_idx` ON `meeting_student_status` (`meeting_id`,`student_id`);