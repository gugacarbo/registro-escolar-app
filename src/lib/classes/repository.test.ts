import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import { createClass, findClassById, listClasses } from "./repository";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE classes (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			academic_period TEXT NOT NULL,
			course TEXT,
			grade TEXT,
			shift TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("classes repository", () => {
	it("cria uma turma", async () => {
		const { db } = createTestDb();
		const created = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026",
		});
		expect(created.id).toBeTypeOf("string");
		expect(created.name).toBe("7º A");
		expect(created.createdAt).toBeInstanceOf(Date);
	});

	it("permite turmas equivalentes em períodos distintos (borda 1)", async () => {
		const { db } = createTestDb();
		await createClass(db, { name: "7º A", academicPeriod: "2025" });
		const second = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026",
		});
		expect(second.id).toBeTypeOf("string");
		const all = await listClasses(db, {});
		expect(all).toHaveLength(2);
	});

	it("busca por id e lista com busca textual", async () => {
		const { db } = createTestDb();
		const created = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026",
		});
		await createClass(db, { name: "8º B", academicPeriod: "2026" });
		const found = await findClassById(db, created.id);
		expect(found?.name).toBe("7º A");
		const results = await listClasses(db, { search: "7º" });
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("7º A");
	});
});
