import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import {
	createStudent,
	findStudentById,
	findStudentsByNameOrDocument,
	listStudents,
	updateStudent,
} from "./repository";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE students (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			document TEXT,
			registration_number TEXT,
			email TEXT,
			phone TEXT,
			birth_date INTEGER,
			notes TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("students repository", () => {
	it("creates a student", async () => {
		const { db } = createTestDb();
		const student = await createStudent(db, { name: "João Silva" });
		expect(student.name).toBe("João Silva");
		expect(student.id).toBeTypeOf("string");
		expect(student.createdAt).toBeInstanceOf(Date);
	});

	it("finds a student by id", async () => {
		const { db } = createTestDb();
		const created = await createStudent(db, {
			name: "Maria Souza",
			document: "123456",
		});
		const found = await findStudentById(db, created.id);
		expect(found).not.toBeNull();
		expect(found?.name).toBe("Maria Souza");
	});

	it("finds students by name or document", async () => {
		const { db } = createTestDb();
		await createStudent(db, { name: "Ana Paula", document: "987654" });
		const byName = await findStudentsByNameOrDocument(db, {
			name: "Ana Paula",
		});
		const byDoc = await findStudentsByNameOrDocument(db, {
			document: "987654",
		});
		expect(byName).toHaveLength(1);
		expect(byDoc).toHaveLength(1);
	});

	it("lists students ordered by createdAt desc", async () => {
		const { db } = createTestDb();
		await createStudent(db, { name: "Primeiro" });
		await new Promise((resolve) => setTimeout(resolve, 10));
		await createStudent(db, { name: "Segundo" });
		const all = await listStudents(db, { limit: 10 });
		expect(all).toHaveLength(2);
		expect(all[0].name).toBe("Segundo");
		expect(all[1].name).toBe("Primeiro");
	});

	it("updates a student", async () => {
		const { db } = createTestDb();
		const created = await createStudent(db, { name: "João Silva" });
		const updated = await updateStudent(db, created.id, {
			name: "João Souza",
			document: "123456",
			notes: "Atualizado",
		});
		expect(updated.id).toBe(created.id);
		expect(updated.name).toBe("João Souza");
		expect(updated.document).toBe("123456");
	});

	it("returns an empty list when no duplicate filter is provided", async () => {
		const { db } = createTestDb();
		const found = await findStudentsByNameOrDocument(db, {});
		expect(found).toEqual([]);
	});

	it("searches students by name", async () => {
		const { db } = createTestDb();
		await createStudent(db, { name: "Carlos Andrade" });
		await createStudent(db, { name: "Bruna Lima" });
		const results = await listStudents(db, { search: "Carlos" });
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("Carlos Andrade");
	});
});
