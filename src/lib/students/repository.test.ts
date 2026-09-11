import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import { enrollments } from "#/db/schema";
import { createClass } from "#/lib/classes/repository";
import { dateStringToTimestamp } from "#/lib/enrollments/dates";

import {
	countStudents,
	createStudent,
	findStudentById,
	findStudentDetail,
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

function ts(day: string) {
	return new Date(dateStringToTimestamp(day));
}

async function createEnrollment(
	db: DB,
	override: {
		studentId: string;
		classId: string;
		startDate?: Date;
		endDate?: Date | null;
		status?: string;
	},
) {
	await db.insert(enrollments).values({
		id: crypto.randomUUID(),
		studentId: override.studentId,
		classId: override.classId,
		startDate: override.startDate ?? ts("2026-02-01"),
		endDate: override.endDate ?? null,
		status: override.status ?? "ativa",
	});
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

	it("busca o detalhe com vínculos, período e status em ordem decrescente", async () => {
		const { db } = createTestDb();
		const student = await createStudent(db, { name: "Ana Vínculos" });
		const classA = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026.1",
		});
		const classB = await createClass(db, {
			name: "6º B",
			academicPeriod: "2025.2",
		});
		await createEnrollment(db, {
			studentId: student.id,
			classId: classA.id,
			startDate: ts("2026-02-01"),
		});
		await createEnrollment(db, {
			studentId: student.id,
			classId: classB.id,
			startDate: ts("2025-02-01"),
			endDate: ts("2025-06-30"),
			status: "encerrada",
		});

		const detail = await findStudentDetail(db, student.id);
		expect(detail?.name).toBe("Ana Vínculos");
		expect(detail?.matriculas).toHaveLength(2);
		expect(detail?.matriculas[0]).toMatchObject({
			id: classA.id,
			name: "7º A",
			endDate: null,
			status: "ativa",
		});
		expect(String(detail?.matriculas[0].startDate)).toBe(
			"2026-02-01T00:00:00.000Z",
		);
		expect(detail?.matriculas[1]).toMatchObject({
			id: classB.id,
			name: "6º B",
			status: "encerrada",
		});
		expect(String(detail?.matriculas[1].endDate)).toBe(
			"2025-06-30T00:00:00.000Z",
		);
	});

	it("retorna null no detalhe quando o estudante não existe", async () => {
		const { db } = createTestDb();
		expect(await findStudentDetail(db, "missing")).toBeNull();
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

	it("anexa as turmas ativas de cada estudante", async () => {
		const { db } = createTestDb();
		const student = await createStudent(db, { name: "Ana Turma" });
		const classA = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026.1",
		});
		const classB = await createClass(db, {
			name: "8º B",
			academicPeriod: "2026.1",
		});
		await createEnrollment(db, {
			studentId: student.id,
			classId: classA.id,
			startDate: ts("2026-02-01"),
		});
		await createEnrollment(db, {
			studentId: student.id,
			classId: classB.id,
			startDate: ts("2026-03-01"),
		});

		const [row] = await listStudents(db, { limit: 10 });
		expect(row.turmas).toEqual(
			expect.arrayContaining([
				{ id: classA.id, name: "7º A" },
				{ id: classB.id, name: "8º B" },
			]),
		);
		expect(row.turmas).toHaveLength(2);
	});

	it("exclui matrícula encerrada da lista de turmas", async () => {
		const { db } = createTestDb();
		const student = await createStudent(db, { name: "Ana Encerrada" });
		const classA = await createClass(db, {
			name: "7º A",
			academicPeriod: "2025.2",
		});
		await createEnrollment(db, {
			studentId: student.id,
			classId: classA.id,
			startDate: ts("2025-02-01"),
			endDate: ts("2025-06-30"),
		});

		const [row] = await listStudents(db, { limit: 10 });
		expect(row.turmas).toEqual([]);
	});

	it("filtra estudantes pela turma apenas com matrícula ativa", async () => {
		const { db } = createTestDb();
		const active = await createStudent(db, { name: "Ativo Turma" });
		const inactive = await createStudent(db, { name: "Inativo Turma" });
		const classRow = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026.1",
		});
		await createEnrollment(db, {
			studentId: active.id,
			classId: classRow.id,
		});
		await createEnrollment(db, {
			studentId: inactive.id,
			classId: classRow.id,
			endDate: ts("2026-06-30"),
		});

		const results = await listStudents(db, {
			classId: classRow.id,
			limit: 10,
		});
		expect(results.map((row) => row.name)).toEqual(["Ativo Turma"]);
	});

	it("combina busca e filtro por turma", async () => {
		const { db } = createTestDb();
		const match = await createStudent(db, { name: "Carlos Turma" });
		await createStudent(db, { name: "Carlos Sem Turma" });
		const classRow = await createClass(db, {
			name: "7º A",
			academicPeriod: "2026.1",
		});
		await createEnrollment(db, { studentId: match.id, classId: classRow.id });

		const results = await listStudents(db, {
			search: "Carlos",
			classId: classRow.id,
			limit: 10,
		});
		expect(results.map((row) => row.name)).toEqual(["Carlos Turma"]);
		expect(await countStudents(db, { classId: classRow.id })).toBe(1);
		expect(
			await countStudents(db, { search: "Carlos", classId: classRow.id }),
		).toBe(1);
	});

	it("counts students with the same filter as list", async () => {
		const { db } = createTestDb();
		await createStudent(db, { name: "Carlos Andrade", document: "111" });
		await createStudent(db, { name: "Bruna Lima", document: "222" });
		expect(await countStudents(db)).toBe(2);
		expect(await countStudents(db, { search: "Carlos" })).toBe(1);
		expect(await countStudents(db, { search: "222" })).toBe(1);
		expect(await countStudents(db, { search: "  " })).toBe(2);
	});
});
