import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import type { DB } from "#/db";
import { meetingStudentStatus } from "#/db/meeting-student-status-schema";
import * as schema from "#/db/schema";
import {
	getMeetingProgress,
	isClassLinkedToMeeting,
	isStudentEnrolledInClassAtDate,
	listStudentsWithStatus,
	upsertStudentStatus,
} from "./repository";

const DAY_MS = 24 * 60 * 60 * 1000;
const meetingDate = new Date("2025-06-10T12:00:00.000Z");

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE meetings (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'open',
			held_at INTEGER,
			location TEXT,
			template_id TEXT,
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
		CREATE TABLE meeting_classes (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			class_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, class_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		);
		CREATE TABLE students (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			reference TEXT,
			document TEXT,
			registration_number TEXT,
			email TEXT,
			phone TEXT,
			birth_date INTEGER,
			notes TEXT,
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
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (student_id) REFERENCES students(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		);
		CREATE TABLE meeting_student_status (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			class_id TEXT NOT NULL,
			student_id TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pendente',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, class_id, student_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id),
			FOREIGN KEY (student_id) REFERENCES students(id)
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

async function seedBase(db: DB) {
	await db.insert(schema.meetings).values({
		id: "meeting-1",
		title: "Conselho de classe",
		heldAt: meetingDate,
	});
	await db.insert(schema.classes).values([
		{ id: "class-1", name: "1º Ano A", academicPeriod: "2025" },
		{ id: "class-2", name: "2º Ano B", academicPeriod: "2025" },
		{ id: "class-3", name: "3º Ano C", academicPeriod: "2025" },
	]);
	await db.insert(schema.meetingClasses).values([
		{ id: "link-1", meetingId: "meeting-1", classId: "class-1" },
		{ id: "link-2", meetingId: "meeting-1", classId: "class-2" },
	]);
	await db.insert(schema.students).values([
		{
			id: "student-1",
			name: "Ana Souza",
			document: "123.456.789-00",
			registrationNumber: "2025001",
		},
		{ id: "student-2", name: "Bruno Lima", registrationNumber: "2025002" },
		{ id: "student-3", name: "Carla Dias", registrationNumber: "2025003" },
	]);
}

async function seedEnrollments(db: DB) {
	await db.insert(schema.enrollments).values([
		{
			id: "enroll-1",
			studentId: "student-1",
			classId: "class-1",
			startDate: new Date(meetingDate.getTime() - 30 * DAY_MS),
		},
		{
			id: "enroll-2",
			studentId: "student-2",
			classId: "class-1",
			startDate: new Date(meetingDate.getTime() - 30 * DAY_MS),
			endDate: new Date(meetingDate.getTime() - DAY_MS),
		},
		{
			id: "enroll-3",
			studentId: "student-3",
			classId: "class-1",
			startDate: new Date(meetingDate.getTime() + DAY_MS),
		},
		{
			id: "enroll-4",
			studentId: "student-1",
			classId: "class-2",
			startDate: new Date(meetingDate.getTime() - 30 * DAY_MS),
		},
	]);
}

describe("listStudentsWithStatus", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
		await seedEnrollments(setup.db);
	});

	it("lista apenas estudantes com vínculo ativo na data da reunião", async () => {
		const result = await listStudentsWithStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			dateMs: meetingDate.getTime(),
		});
		expect(result.students.map((s) => s.studentId)).toEqual(["student-1"]);
	});

	it("trata ausência de registro como pendente e calcula contadores", async () => {
		const result = await listStudentsWithStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			dateMs: meetingDate.getTime(),
		});
		expect(result.students[0]?.status).toBe("pendente");
		expect(result.counters).toEqual({
			total: 1,
			pendente: 1,
			em_discussao: 0,
			concluido: 0,
			nao_discutido: 0,
		});
		expect(result.nextPendingStudentId).toBe("student-1");
	});

	it("lista estudantes que saíram exatamente no dia da reunião (endDate >= data)", async () => {
		await setup.db.insert(schema.enrollments).values({
			id: "enroll-5",
			studentId: "student-2",
			classId: "class-1",
			startDate: new Date(meetingDate.getTime() - 30 * DAY_MS),
			endDate: meetingDate,
		});
		const result = await listStudentsWithStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			dateMs: meetingDate.getTime(),
		});
		expect(result.students.map((s) => s.studentId)).toEqual([
			"student-1",
			"student-2",
		]);
	});

	it("retorna lista vazia para turma sem estudantes", async () => {
		const result = await listStudentsWithStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-3",
			dateMs: meetingDate.getTime(),
		});
		expect(result.counters.total).toBe(0);
		expect(result.nextPendingStudentId).toBeNull();
	});
});

describe("upsertStudentStatus", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
		await seedEnrollments(setup.db);
	});

	it("cria o registro de status", async () => {
		const row = await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "em_discussao",
		});
		expect(row.status).toBe("em_discussao");
	});

	it("atualiza o status existente sem duplicar (índice único triplo)", async () => {
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "em_discussao",
		});
		const row = await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "concluido",
		});
		expect(row.status).toBe("concluido");
		const rows = await setup.db.select().from(meetingStudentStatus);
		expect(rows).toHaveLength(1);
	});

	it("mantém status independente por turma para o mesmo estudante", async () => {
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "concluido",
		});
		const other = await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-2",
			studentId: "student-1",
			status: "pendente",
		});
		expect(other.status).toBe("pendente");

		const class1 = await listStudentsWithStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			dateMs: meetingDate.getTime(),
		});
		const class2 = await listStudentsWithStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-2",
			dateMs: meetingDate.getTime(),
		});
		expect(class1.students[0]?.status).toBe("concluido");
		expect(class2.students[0]?.status).toBe("pendente");
	});

	it("impõe o índice único (meetingId, classId, studentId)", async () => {
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "pendente",
		});
		await expect(
			setup.db
				.insert(meetingStudentStatus)
				.values({
					id: "duplicate-1",
					meetingId: "meeting-1",
					classId: "class-1",
					studentId: "student-1",
					status: "concluido",
				})
				.returning(),
		).rejects.toThrow();
	});
});

describe("isStudentEnrolledInClassAtDate / isClassLinkedToMeeting", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
		await seedEnrollments(setup.db);
	});

	it("confirma vínculo ativo e rejeita vínculo encerrado ou futuro", async () => {
		await expect(
			isStudentEnrolledInClassAtDate(setup.db, {
				studentId: "student-1",
				classId: "class-1",
				dateMs: meetingDate.getTime(),
			}),
		).resolves.toBe(true);
		await expect(
			isStudentEnrolledInClassAtDate(setup.db, {
				studentId: "student-2",
				classId: "class-1",
				dateMs: meetingDate.getTime(),
			}),
		).resolves.toBe(false);
		await expect(
			isStudentEnrolledInClassAtDate(setup.db, {
				studentId: "student-3",
				classId: "class-1",
				dateMs: meetingDate.getTime(),
			}),
		).resolves.toBe(false);
	});

	it("confirma turma vinculada à reunião e rejeita turma não vinculada", async () => {
		await expect(
			isClassLinkedToMeeting(setup.db, "meeting-1", "class-1"),
		).resolves.toBe(true);
		await expect(
			isClassLinkedToMeeting(setup.db, "meeting-1", "missing-class"),
		).resolves.toBe(false);
	});
});

describe("getMeetingProgress", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
		await seedEnrollments(setup.db);
	});

	it("retorna zero para reunião sem acompanhamento", async () => {
		const progress = await getMeetingProgress(setup.db, "meeting-1");
		expect(progress).toEqual({
			total: 2,
			concluded: 0,
			percentage: 0,
			completed: false,
		});
	});

	it("calcula percentual com base nos concluídos de todas as turmas", async () => {
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "concluido",
		});
		const progress = await getMeetingProgress(setup.db, "meeting-1");
		expect(progress).toEqual({
			total: 2,
			concluded: 1,
			percentage: 50,
			completed: false,
		});
	});

	it("marca como concluída quando todos os estudantes foram concluídos", async () => {
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "concluido",
		});
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-2",
			studentId: "student-1",
			status: "concluido",
		});
		const progress = await getMeetingProgress(setup.db, "meeting-1");
		expect(progress.percentage).toBe(100);
		expect(progress.completed).toBe(true);
	});

	it("não conta registros de estudantes fora do vínculo temporal", async () => {
		await upsertStudentStatus(setup.db, {
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-2",
			status: "concluido",
		});
		const progress = await getMeetingProgress(setup.db, "meeting-1");
		expect(progress.total).toBe(2);
		expect(progress.concluded).toBe(0);
	});

	it("usa createdAt quando a reunião não tem heldAt e retorna zero sem turmas", async () => {
		await setup.db
			.update(schema.meetings)
			.set({ heldAt: null })
			.where(eq(schema.meetings.id, "meeting-1"));
		const progress = await getMeetingProgress(setup.db, "meeting-1");
		expect(progress.total).toBe(3);
		const missing = await getMeetingProgress(setup.db, "missing-meeting");
		expect(missing).toEqual({
			total: 0,
			concluded: 0,
			percentage: 0,
			completed: false,
		});
	});
});
