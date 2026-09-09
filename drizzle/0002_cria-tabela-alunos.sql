CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`registration_number` text,
	`email` text,
	`phone` text,
	`birth_date` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `students_name_idx` ON `students` (`name`);
--> statement-breakpoint
CREATE INDEX `students_document_idx` ON `students` (`document`);
