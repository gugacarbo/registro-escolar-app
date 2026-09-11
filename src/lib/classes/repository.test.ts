import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import { createEnrollmentWithTransfer } from "#/lib/enrollments/repository";
import { createStudent } from "#/lib/students/repository";

import {
	countClasses,
	createClass,
	findClassById,
	listAcademicPeriods,
	listClasses,
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
		CREATE TABLE enrollments (
			id TEXT PRIMARY KEY,
			student_id TEXT NOT NULL,
			class_id TEXT NOT NULL,
			start_date INTEGER NOT NULL,
			end_date INTEGER,
			status TEXT NOT NULL DEFAULT 'ativa',
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

	it("conta turmas respeitando a busca", async () => {
		const { db } = createTestDb();
		await createClass(db, { name: "7º A", academicPeriod: "2026" });
		await createClass(db, { name: "8º B", academicPeriod: "2026" });
		expect(await countClasses(db, {})).toBe(2);
		expect(await countClasses(db, { search: "7º" })).toBe(1);
		expect(await countClasses(db, { search: "  " })).toBe(2);
	});

	it("filtra e conta turmas por período letivo", async () => {
		const { db } = createTestDb();
		await createClass(db, { name: "7º A", academicPeriod: "2025" });
		await createClass(db, { name: "8º B", academicPeriod: "2026" });
		await createClass(db, { name: "9º C", academicPeriod: "2026" });
		expect(await listClasses(db, { academicPeriod: "2026" })).toHaveLength(2);
		expect(await countClasses(db, { academicPeriod: "2026" })).toBe(2);
		expect(await countClasses(db, { academicPeriod: "2025" })).toBe(1);
		expect(await listAcademicPeriods(db)).toEqual(["2025", "2026"]);
	});

	it("inclui a contagem de estudantes ativos da turma", async () => {
		const { db } = createTestDb();
		const classRow = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026",
		});
		const emptyClass = await createClass(db, {
			name: "8º B",
			academicPeriod: "2026",
		});
		const active = await createStudent(db, { name: "Aluno Ativo" });
		const transferred = await createStudent(db, { name: "Aluno Encerrado" });
		await createEnrollmentWithTransfer(db, {
			studentId: active.id,
			classId: classRow.id,
			startDate: new Date("2026-02-01T00:00:00Z"),
			status: "ativa",
		});
		await createEnrollmentWithTransfer(db, {
			studentId: transferred.id,
			classId: classRow.id,
			startDate: new Date("2026-02-01T00:00:00Z"),
			endDate: new Date("2026-06-01T00:00:00Z"),
			status: "transferida",
		});

		const listed = await listClasses(db, {});
		expect(
			listed.find((row) => row.id === classRow.id)?.activeStudentCount,
		).toBe(1);
		expect(
			listed.find((row) => row.id === emptyClass.id)?.activeStudentCount,
		).toBe(0);
	});
});
