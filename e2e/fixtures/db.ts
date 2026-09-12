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

// Tables in delete order (children before parents is not required here
// because foreign_keys are OFF during the reset).
const RESET_TABLES = [
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

const USER_DELETE_TRIGGER = `CREATE TRIGGER user_permanent_admin_delete_check
BEFORE DELETE ON user
WHEN OLD.is_permanent_admin = 1
BEGIN
	SELECT RAISE(ABORT, 'permanent administrator cannot be deleted');
END`;

function sleepSync(ms: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function resetDatabase() {
	ensureParentDir(E2E_DB_PATH);
	// The Miniflare D1 instance keeps the same sqlite file open while the
	// preview server handles requests, so a reset can hit SQLITE_BUSY. Retry
	// with backoff instead of blocking a single statement for 30s (which
	// stalls the server and surfaces in Playwright as page.goto ERR_ABORTED).
	const maxAttempts = 5;
	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			resetDatabaseOnce();
			return;
		} catch (err) {
			lastError = err;
			const message = err instanceof Error ? err.message : String(err);
			const busy = /busy|locked/i.test(message);
			if (!busy || attempt === maxAttempts) throw err;
			sleepSync(200 * attempt);
		}
	}
	throw lastError;
}

function resetDatabaseOnce() {
	const sqlite = new Database(E2E_DB_PATH);
	// Fail fast per statement so the retry loop above can back off; holding a
	// 30s busy_timeout here blocks the server behind the same lock.
	sqlite.pragma("busy_timeout = 5000");
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = OFF");
	try {
		// Clear application data without removing the schema that the running
		// Miniflare D1 instance keeps open between requests. A single
		// transaction holds the RESERVED lock once instead of once per table.
		sqlite.exec("BEGIN IMMEDIATE");
		try {
			for (const table of RESET_TABLES) {
				if (table === "user") {
					sqlite.exec("DROP TRIGGER user_permanent_admin_delete_check");
				}
				sqlite.exec(`DELETE FROM "${table}"`);
				if (table === "user") {
					sqlite.exec(USER_DELETE_TRIGGER);
				}
			}
			sqlite.exec("COMMIT");
		} catch (err) {
			try {
				sqlite.exec("ROLLBACK");
			} catch {
				// Ignore rollback errors; rethrow the original failure.
			}
			throw err;
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
