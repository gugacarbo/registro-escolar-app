PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_meeting_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_meeting_participants`("id", "meeting_id", "staff_id", "role_id", "created_at", "updated_at")
SELECT "id", "meeting_id", "staff_id", "role_id", "created_at", "updated_at"
FROM `meeting_participants`;
--> statement-breakpoint
DROP TABLE `meeting_participants`;
--> statement-breakpoint
ALTER TABLE `__new_meeting_participants` RENAME TO `meeting_participants`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE UNIQUE INDEX `meeting_participants_meeting_staff_role_uidx` ON `meeting_participants` (`meeting_id`,`staff_id`,`role_id`);
--> statement-breakpoint
CREATE INDEX `meeting_participants_meeting_idx` ON `meeting_participants` (`meeting_id`);
--> statement-breakpoint
CREATE INDEX `meeting_participants_staff_idx` ON `meeting_participants` (`staff_id`);
--> statement-breakpoint
CREATE INDEX `meeting_participants_role_idx` ON `meeting_participants` (`role_id`);
