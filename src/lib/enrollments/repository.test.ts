import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import { createClass } from "#/lib/classes/repository";
import { createStudent } from "#/lib/students/repository";

import { dateStringToTimestamp, previousDay } from "./dates";
import {
	closeEnrollment,
	createEnrollmentWithTransfer,
	findOverlappingEnrollment,
	listStudentsByClassAtDate,
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

async function seedStudentAndClass(db: DB) {
	const student = await createStudent(db, { name: "João Silva" });
	const classRow = await createClass(db, {
		name: "7º A",
		academicPeriod: "2026",
	});
	return { student, classRow };
}

describe("enrollments repository", () => {
	it("detecta sobreposição na mesma turma (borda 4)", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		const created = await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			status: "ativa",
		});
		expect("enrollment" in created).toBe(true);

		const overlap = await findOverlappingEnrollment(db, {
			studentId: student.id,
			classId: classRow.id,
			start: ts("2026-03-01"),
			end: null,
		});
		expect(overlap).toBeDefined();
	});

	it("não aponta sobreposição em intervalo disjunto", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			endDate: ts("2026-03-01"),
			status: "concluida",
		});
		const overlap = await findOverlappingEnrollment(db, {
			studentId: student.id,
			classId: classRow.id,
			start: ts("2026-04-01"),
			end: null,
		});
		expect(overlap).toBeUndefined();
	});

	it("transferência encerra vínculo anterior sem apagar histórico (borda 2)", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		const other = await createClass(db, {
			name: "7º B",
			academicPeriod: "2026",
		});
		await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			status: "ativa",
		});
		const result = await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: other.id,
			startDate: ts("2026-06-01"),
			status: "ativa",
		});
		expect("enrollment" in result).toBe(true);
		if ("enrollment" in result) {
			expect(result.closedEnrollments ?? []).toHaveLength(1);
			expect(result.closedEnrollments?.[0].status).toBe("transferida");
			expect(result.closedEnrollments?.[0].endDate?.getTime()).toBe(
				previousDay(dateStringToTimestamp("2026-06-01")),
			);
		}
	});

	it("closeEnrollment só atualiza, nunca apaga", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		const result = await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			status: "ativa",
		});
		if (!("enrollment" in result) || !result.enrollment) {
			throw new Error("esperava vínculo criado");
		}
		const closed = await closeEnrollment(
			db,
			result.enrollment.id,
			ts("2026-05-01"),
			"concluida",
		);
		expect(closed.id).toBe(result.enrollment.id);
		expect(closed.status).toBe("concluida");
	});

	it("inclui vínculo sem término em data futura (borda 5)", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			status: "ativa",
		});
		const rows = await listStudentsByClassAtDate(
			db,
			classRow.id,
			ts("2027-01-01"),
		);
		expect(rows).toHaveLength(1);
	});

	it("retorna vazio fora de qualquer vínculo (borda 3)", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			endDate: ts("2026-06-30"),
			status: "concluida",
		});
		const before = await listStudentsByClassAtDate(
			db,
			classRow.id,
			ts("2026-01-15"),
		);
		const after = await listStudentsByClassAtDate(
			db,
			classRow.id,
			ts("2026-07-01"),
		);
		expect(before).toEqual([]);
		expect(after).toEqual([]);
	});

	it("inclui fronteiras startDate e endDate", async () => {
		const { db } = createTestDb();
		const { student, classRow } = await seedStudentAndClass(db);
		await createEnrollmentWithTransfer(db, {
			studentId: student.id,
			classId: classRow.id,
			startDate: ts("2026-02-01"),
			endDate: ts("2026-06-30"),
			status: "ativa",
		});
		expect(
			await listStudentsByClassAtDate(db, classRow.id, ts("2026-02-01")),
		).toHaveLength(1);
		expect(
			await listStudentsByClassAtDate(db, classRow.id, ts("2026-06-30")),
		).toHaveLength(1);
	});
});
