ALTER TABLE `user` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `is_permanent_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user` (`role`);--> statement-breakpoint
UPDATE `user` SET `role` = 'user', `is_permanent_admin` = 0;--> statement-breakpoint
UPDATE `user`
SET `role` = 'admin', `is_permanent_admin` = 1
WHERE `id` = (
	SELECT `id` FROM `user` ORDER BY `created_at` ASC, `id` ASC LIMIT 1
);--> statement-breakpoint
CREATE UNIQUE INDEX `user_permanent_admin_uidx`
ON `user` (`is_permanent_admin`)
WHERE `is_permanent_admin` = 1;--> statement-breakpoint
CREATE TRIGGER `user_role_insert_check`
BEFORE INSERT ON `user`
WHEN NEW.`role` != 'user' OR NEW.`is_permanent_admin` != 0
BEGIN
	SELECT RAISE(ABORT, 'new users must start as regular users');
END;--> statement-breakpoint
CREATE TRIGGER `user_role_update_check`
BEFORE UPDATE OF `role` ON `user`
WHEN NEW.`role` NOT IN ('admin', 'user')
BEGIN
	SELECT RAISE(ABORT, 'invalid user role');
END;--> statement-breakpoint
CREATE TRIGGER `user_permanent_admin_update_check`
BEFORE UPDATE OF `role`, `is_permanent_admin` ON `user`
WHEN
	(OLD.`is_permanent_admin` = 1 AND
		(NEW.`role` != 'admin' OR NEW.`is_permanent_admin` != 1)) OR
	(OLD.`is_permanent_admin` = 0 AND NEW.`is_permanent_admin` = 1 AND
		EXISTS (SELECT 1 FROM `user` WHERE `is_permanent_admin` = 1))
BEGIN
	SELECT RAISE(ABORT, 'permanent administrator cannot be changed');
END;--> statement-breakpoint
CREATE TRIGGER `user_permanent_admin_delete_check`
BEFORE DELETE ON `user`
WHEN OLD.`is_permanent_admin` = 1
BEGIN
	SELECT RAISE(ABORT, 'permanent administrator cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `user_first_permanent_admin`
AFTER INSERT ON `user`
WHEN NOT EXISTS (SELECT 1 FROM `user` WHERE `is_permanent_admin` = 1)
BEGIN
	UPDATE `user`
	SET `role` = 'admin', `is_permanent_admin` = 1
	WHERE `id` = NEW.`id`;
END;
