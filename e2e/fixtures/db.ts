import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const E2E_DB_PATH = process.env.E2E_DB_PATH ?? ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/e2e.db";

function ensureParentDir(path: string) {
	const parent = path.split("/").slice(0, -1).join("/");
	if (!parent) return;
	mkdirSync(parent, { recursive: true });
}

export function resetDatabase() {
	ensureParentDir(E2E_DB_PATH);
	const sqlite = new Database(E2E_DB_PATH);
	sqlite.pragma("foreign_keys = OFF");
	try {
		// Drop all application tables. Order matters due to FKs.
		const tables = [
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
			sqlite.exec(`DROP TABLE IF EXISTS "${table}"`);
		}

		// Reapply migrations from drizzle/*.sql in lexical order.
		const migrationsDir = join(process.cwd(), "drizzle");
		const files = readdirSync(migrationsDir)
			.filter((f) => f.endsWith(".sql"))
			.sort();

		for (const file of files) {
			const sql = readFileSync(join(migrationsDir, file), "utf-8");
			// Split on statement-breakpoint comments to run each statement separately.
			const statements = sql
				.split(/-->\s*statement-breakpoint/)
				.map((s) => s.trim())
				.filter(Boolean);
			for (const statement of statements) {
				// Skip Drizzle metadata statements that may reference missing tables.
				if (statement.includes("__drizzle_migrations")) continue;
				sqlite.exec(statement);
			}
		}
	} finally {
		sqlite.close();
	}
}
