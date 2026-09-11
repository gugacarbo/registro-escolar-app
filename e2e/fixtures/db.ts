import Database from "better-sqlite3";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const defaultE2EDirectory =
	".wrangler/state/e2e/v3/d1/miniflare-D1DatabaseObject";

function resolveE2EDatabasePath() {
	if (process.env.E2E_DB_PATH) return process.env.E2E_DB_PATH;
	const files = readdirSync(defaultE2EDirectory).filter(
		(file) =>
			file.endsWith(".sqlite") &&
			file !== "metadata.sqlite" &&
			file !== "e2e.sqlite",
	);
	if (files.length !== 1) {
		throw new Error(
			`Could not uniquely resolve e2e D1 database in ${defaultE2EDirectory}; found ${files.join(", ") || "none"}`,
		);
	}
	return join(defaultE2EDirectory, files[0]);
}

export const E2E_DB_PATH = resolveE2EDatabasePath();

function ensureParentDir(path: string) {
	const parent = path.split("/").slice(0, -1).join("/");
	if (!parent) return;
	mkdirSync(parent, { recursive: true });
}

export function resetDatabase() {
	ensureParentDir(E2E_DB_PATH);
	const sqlite = new Database(E2E_DB_PATH);
	sqlite.pragma("busy_timeout = 30000");
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = OFF");
	try {
		// Clear application data without removing the schema that the running
		// Miniflare D1 instance keeps open between requests.
		const tables = [
			"invitation",
			"verification",
			"account",
			"session",
			"user",
			"minute_versions",
			"minutes",
			"minute_templates",
			"general_reports",
			"record_meeting_inclusions",
			"student_records",
			"meeting_student_status",
			"meeting_participants",
			"meeting_classes",
			"meetings",
			"offer_professors",
			"class_offers",
			"components",
			"enrollments",
			"classes",
			"students",
			"roles",
			"staff",
		];
		for (const table of tables) {
			if (table === "user") {
				sqlite.exec("DROP TRIGGER user_permanent_admin_delete_check");
			}
			sqlite.exec(`DELETE FROM "${table}"`);
			if (table === "user") {
				sqlite.exec(`CREATE TRIGGER user_permanent_admin_delete_check
BEFORE DELETE ON user
WHEN OLD.is_permanent_admin = 1
BEGIN
	SELECT RAISE(ABORT, 'permanent administrator cannot be deleted');
END`);
			}
		}
	} finally {
		sqlite.close();
	}
}

export function restoreEnrollmentAsActive(enrollmentId: string) {
	const sqlite = new Database(E2E_DB_PATH);
	sqlite.pragma("busy_timeout = 30000");
	try {
		const result = sqlite
			.prepare(
				"UPDATE enrollments SET end_date = NULL, status = 'ativa' WHERE id = ?",
			)
			.run(enrollmentId);
		if (result.changes !== 1) {
			throw new Error(`Enrollment not found: ${enrollmentId}`);
		}
	} finally {
		sqlite.close();
	}
}
