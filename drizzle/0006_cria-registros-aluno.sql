CREATE TABLE `record_meeting_inclusions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_record_id` text NOT NULL,
	`meeting_id` text NOT NULL,
	`include` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `record_meeting_inclusions_record_meeting_uidx` ON `record_meeting_inclusions` (`student_record_id`,`meeting_id`);--> statement-breakpoint
CREATE INDEX `record_meeting_inclusions_meeting_idx` ON `record_meeting_inclusions` (`meeting_id`);--> statement-breakpoint
CREATE TABLE `student_records` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`meeting_id` text,
	`class_id` text,
	`component_id` text,
	`origin_id` text,
	`texto` text NOT NULL,
	`categoria_id` text,
	`include_in_minutes` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`origin_id`) REFERENCES `meeting_participants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `student_records_student_idx` ON `student_records` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_records_meeting_student_idx` ON `student_records` (`meeting_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `student_records_meeting_idx` ON `student_records` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `student_records_class_idx` ON `student_records` (`class_id`);