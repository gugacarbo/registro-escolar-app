import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import { getClassHistory, getStudentHistory } from "./repository";

/**
 * Specs 0011 (histórico do estudante) e 0012 (histórico da turma): composição
 * temporal via vínculos (ADR-0015) sobre sqlite em memória.
 */

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE meetings (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			held_at INTEGER,
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
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		);
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
		CREATE TABLE student_records (
			id TEXT PRIMARY KEY,
			student_id TEXT NOT NULL,
			meeting_id TEXT,
			class_id TEXT,
			component_id TEXT,
			origin_id TEXT,
			texto TEXT NOT NULL,
			categoria_id TEXT,
			include_in_minutes INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE meeting_student_status (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			class_id TEXT NOT NULL,
			student_id TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pendente',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE general_reports (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			origin_id TEXT,
			category_id TEXT,
			texto TEXT NOT NULL,
			include_in_minutes INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db };
}

const start = new Date("2025-02-01T00:00:00.000Z");
const end = new Date("2025-07-01T00:00:00.000Z");
const june = new Date("2025-06-10T12:00:00.000Z");
const august = new Date("2025-08-20T12:00:00.000Z");

async function seedBase(db: DB) {
	await db.insert(schema.classes).values([
		{ id: "class-1", name: "1º Ano A", academicPeriod: "2025" },
		{ id: "class-2", name: "2º Ano B", academicPeriod: "2025" },
		{ id: "class-3", name: "3º Ano C", academicPeriod: "2024" },
	]);
	await db.insert(schema.students).values({
		id: "student-1",
		name: "Ana Souza",
		registrationNumber: "2025001",
	});
	await db.insert(schema.meetings).values([
		{ id: "meeting-1", title: "Conselho Junho", heldAt: june },
		{ id: "meeting-2", title: "Conselho Agosto", heldAt: august },
	]);
	await db.insert(schema.meetingClasses).values([
		{ id: "link-1", meetingId: "meeting-1", classId: "class-1" },
		{ id: "link-2", meetingId: "meeting-2", classId: "class-2" },
	]);
	await db.insert(schema.enrollments).values([
		{
			id: "enr-1",
			studentId: "student-1",
			classId: "class-1",
			startDate: start,
		},
		{
			id: "enr-2",
			studentId: "student-1",
			classId: "class-2",
			startDate: start,
			endDate: end,
			status: "encerrada",
		},
	]);
	await db.insert(schema.studentRecords).values([
		{
			id: "rec-1",
			studentId: "student-1",
			meetingId: "meeting-1",
			texto: "Baixo rendimento em matemática",
			categoriaId: "cat-1",
			createdAt: june,
			updatedAt: june,
		},
		{
			id: "rec-2",
			studentId: "student-1",
			classId: "class-2",
			texto: "Acompanhamento externo",
			includeInMinutes: false,
			createdAt: end,
			updatedAt: end,
		},
	]);
	await db.insert(schema.meetingStudentStatus).values({
		id: "status-1",
		meetingId: "meeting-1",
		classId: "class-1",
		studentId: "student-1",
		status: "em_discussao",
		createdAt: june,
		updatedAt: june,
	});
	await db.insert(schema.generalReports).values({
		id: "report-1",
		meetingId: "meeting-1",
		texto: "Atmosfera produtiva",
		createdAt: june,
		updatedAt: june,
	});
}

describe("getStudentHistory (spec 0011)", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("retorna null para estudante inexistente", async () => {
		const result = await getStudentHistory(setup.db, "missing", {});
		expect(result).toBeNull();
	});

	it("exibe registros de ambas as turmas na mesma linha histórica (borda 1 / CA-001)", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {});
		expect(result?.estudante.name).toBe("Ana Souza");
		const tipos = new Set(result?.eventos.map((e) => e.tipo));
		expect(tipos.has("matricula")).toBe(true);
		expect(tipos.has("encerramento_matricula")).toBe(true);
		const turmas = new Set(result?.eventos.map((e) => e.turmaId));
		expect(turmas.has("class-1")).toBe(true);
		expect(turmas.has("class-2")).toBe(true);
	});

	it("ordena eventos cronologicamente", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {});
		const datas = result?.eventos.map((e) => e.data) ?? [];
		const ordenado = [...datas].sort();
		expect(datas).toEqual(ordenado);
	});

	it("inclui registro interno no histórico (borda 4)", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {});
		const interno = result?.eventos.find((e) => e.id === "record:rec-2");
		expect(interno?.interno).toBe(true);
	});

	it("relaciona registro sem turma ao contexto da turma na data (CA-007 / borda 5)", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {});
		const evento = result?.eventos.find((e) => e.id === "record:rec-1");
		expect(evento?.turmaId).toBe("class-1");
		expect(evento?.reuniaoTitulo).toBe("Conselho Junho");
	});

	it("inclui status de reunião de turma com vínculo ativo na data", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {});
		const status = result?.eventos.find((e) => e.id === "status:status-1");
		expect(status?.tipo).toBe("status_reuniao");
		expect(status?.metadata.status).toBe("em_discussao");
	});

	it("filtra por turma", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {
			turmaId: "class-1",
		});
		for (const evento of result?.eventos ?? []) {
			expect(evento.turmaId).toBe("class-1");
		}
	});

	it("filtra por categoria", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {
			categoriaId: "cat-1",
		});
		expect(result?.eventos).toHaveLength(1);
		expect(result?.eventos[0]?.id).toBe("record:rec-1");
	});

	it("busca textual ignora acentos e caixa", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {
			q: "ACOMPANHAMENTO",
		});
		expect(result?.eventos.map((e) => e.id)).toContain("record:rec-2");
	});

	it("filtra por período letivo", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {
			periodo: "1999",
		});
		expect(result?.eventos.every((e) => e.turmaId === null)).toBe(true);
	});
	it("aplica filtros combinados e contextos ausentes", async () => {
		const result = await getStudentHistory(setup.db, "student-1", {
			reuniaoId: "meeting-1",
			componenteId: "missing-component",
			q: "inexistente",
		});
		expect(result?.eventos).toEqual([]);
		const porComponente = await getStudentHistory(setup.db, "student-1", {
			componenteId: "missing-component",
		});
		expect(porComponente?.eventos.filter((e) => e.tipo === "registro")).toEqual(
			[],
		);
		await dbInsertEnrollment(setup.db);
		const historico = await getStudentHistory(setup.db, "student-1", {});
		expect(historico?.eventos.some((e) => e.turmaId === "class-3")).toBe(true);
	});
	it("usa createdAt quando heldAt ausente e lida com reuniões inexistentes", async () => {
		const createdOnly = new Date("2025-03-01T00:00:00.000Z");
		await setup.db
			.update(schema.meetings)
			.set({ heldAt: null, createdAt: createdOnly })
			.where(eq(schema.meetings.id, "meeting-1"));
		const result = await getStudentHistory(setup.db, "student-1", {});
		const evento = result?.eventos.find((e) => e.id === "record:rec-1");
		expect(evento?.data).toBe(createdOnly.toISOString());
		await setup.db.insert(schema.studentRecords).values({
			id: "rec-orphan",
			studentId: "student-1",
			meetingId: "missing-meeting",
			texto: "Reunião apagada",
			createdAt: createdOnly,
			updatedAt: createdOnly,
		});
		const historico = await getStudentHistory(setup.db, "student-1", {});
		const orphan = historico?.eventos.find((e) => e.id === "record:rec-orphan");
		expect(orphan?.reuniaoTitulo).toBeNull();
	});
});

describe("getClassHistory (spec 0012)", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("retorna null para turma inexistente", async () => {
		const result = await getClassHistory(setup.db, "missing", {});
		expect(result).toBeNull();
	});

	it("turma sem reuniões exibe empty-state de reuniões e lista de estudantes (borda 1)", async () => {
		await dbInsertEnrollment(setup.db);
		const result = await getClassHistory(setup.db, "class-3", {});
		expect(result?.reunioes).toEqual([]);
		expect(result?.eventos).toEqual([]);
		expect(result?.estudantes).toHaveLength(1);
	});

	it("inclui estudantes com vínculo encerrado e status (borda 2)", async () => {
		const result = await getClassHistory(setup.db, "class-2", {});
		const estudante = result?.estudantes.find(
			(a) => a.studentId === "student-1",
		);
		expect(estudante?.status).toBe("encerrada");
		expect(estudante?.endDate).toBe(end.toISOString());
	});

	it("compõe reunião, registro e relato geral cronologicamente", async () => {
		const result = await getClassHistory(setup.db, "class-1", {});
		const tipos = result?.eventos.map((e) => e.tipo);
		expect(tipos).toContain("reuniao");
		expect(tipos).toContain("registro");
		expect(tipos).toContain("relato_geral");
	});

	it("registro interno da turma aparece no histórico (borda 5)", async () => {
		const result = await getClassHistory(setup.db, "class-2", {});
		const interno = result?.eventos.find((e) => e.id === "record:rec-2");
		expect(interno?.interno).toBe(true);
	});

	it("registro de reunião da turma nomeia o estudante", async () => {
		const result = await getClassHistory(setup.db, "class-1", {});
		const registro = result?.eventos.find((e) => e.id === "record:rec-1");
		expect(registro?.studentName).toBe("Ana Souza");
	});

	it("não mistura períodos: período divergente zera eventos (borda 4)", async () => {
		const result = await getClassHistory(setup.db, "class-1", {
			periodo: "1999",
		});
		expect(result?.turma.academicPeriod).toBe("2025");
		expect(result?.eventos).toEqual([]);
	});

	it("filtra por estudante", async () => {
		const result = await getClassHistory(setup.db, "class-1", {
			estudanteId: "student-1",
		});
		expect(result?.eventos.length).toBeGreaterThan(0);
		const result2 = await getClassHistory(setup.db, "class-1", {
			estudanteId: "other",
		});
		expect(result2?.eventos.filter((e) => e.tipo === "registro")).toHaveLength(
			0,
		);
	});

	it("aplica filtros de reunião, categoria, componente e texto", async () => {
		const result = await getClassHistory(setup.db, "class-1", {
			reuniaoId: "meeting-2",
		});
		expect(result?.eventos).toEqual([]);
		const categoria = await getClassHistory(setup.db, "class-1", {
			categoriaId: "cat-other",
		});
		expect(categoria?.eventos.filter((e) => e.tipo === "registro")).toEqual([]);
		const componente = await getClassHistory(setup.db, "class-1", {
			componenteId: "component-other",
		});
		expect(componente?.eventos.filter((e) => e.tipo === "registro")).toEqual(
			[],
		);
		const busca = await getClassHistory(setup.db, "class-1", { q: "zzz" });
		expect(busca?.eventos).toEqual([]);
	});
});

async function dbInsertEnrollment(db: DB) {
	await db.insert(schema.enrollments).values({
		id: "enr-3",
		studentId: "student-1",
		classId: "class-3",
		startDate: start,
	});
}

describe("histórico variações de dados", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("cobre status sem reunião, sem vínculo e vínculo inativo", async () => {
		const june2024 = new Date("2024-06-10T12:00:00.000Z");
		await setup.db.insert(schema.meetingStudentStatus).values([
			{
				id: "status-missing-meeting",
				meetingId: "missing-meeting",
				classId: "class-1",
				studentId: "student-1",
				status: "concluido",
				createdAt: june,
				updatedAt: june,
			},
			{
				id: "status-missing-enrollment",
				meetingId: "meeting-1",
				classId: "missing-class",
				studentId: "student-1",
				status: "concluido",
				createdAt: june,
				updatedAt: june,
			},
			{
				id: "status-inactive",
				meetingId: "meeting-2",
				classId: "class-2",
				studentId: "student-1",
				status: "concluido",
				createdAt: june,
				updatedAt: june2024,
			},
		]);
		const result = await getStudentHistory(setup.db, "student-1", {});
		for (const id of [
			"status:status-missing-meeting",
			"status:status-missing-enrollment",
			"status:status-inactive",
		]) {
			expect(result?.eventos.find((event) => event.id === id)).toBeUndefined();
		}
	});

	it("lida com registro de turma inexistente e encerramento de turma inexistente", async () => {
		await setup.db.insert(schema.studentRecords).values({
			id: "rec-missing-class",
			studentId: "student-1",
			classId: "missing-class",
			texto: "Registro sem turma",
			createdAt: june,
			updatedAt: june,
		});
		const student = await getStudentHistory(setup.db, "student-1", {});
		const missing = student?.eventos.find(
			(event) => event.id === "record:rec-missing-class",
		);
		expect(missing?.turmaId).toBe("missing-class");
		expect(missing?.turmaNome).toBeNull();
	});

	it("usa data de criação da reunião para relato quando heldAt ausente", async () => {
		const createdOnly = new Date("2025-03-01T00:00:00.000Z");
		await setup.db
			.update(schema.meetings)
			.set({ heldAt: null, createdAt: createdOnly })
			.where(eq(schema.meetings.id, "meeting-1"));
		const result = await getClassHistory(setup.db, "class-1", {});
		const relato = result?.eventos.find(
			(event) => event.id === "relato:report-1",
		);
		expect(relato?.data).toBe(createdOnly.toISOString());
	});

	it("lida com vínculos e status de turmas inexistentes", async () => {
		await setup.db.insert(schema.enrollments).values({
			id: "enr-missing",
			studentId: "student-1",
			classId: "missing-class",
			startDate: start,
			endDate: end,
		});
		await setup.db.insert(schema.meetingStudentStatus).values({
			id: "status-missing-class",
			meetingId: "meeting-1",
			classId: "missing-class",
			studentId: "student-1",
			status: "concluido",
			createdAt: june,
			updatedAt: june,
		});
		const student = await getStudentHistory(setup.db, "student-1", {});
		const enrollment = student?.eventos.find(
			(event) => event.id === "matricula:enr-missing",
		);
		expect(enrollment?.turmaNome).toBeNull();
		const closure = student?.eventos.find(
			(event) => event.id === "encerramento:enr-missing",
		);
		expect(closure?.turmaNome).toBeNull();
		const status = student?.eventos.find(
			(event) => event.id === "status:status-missing-class",
		);
		expect(status?.turmaNome).toBeNull();
	});

	it("cobre caminhos de reuniões ausentes e vínculos repetidos", async () => {
		await setup.db.insert(schema.enrollments).values({
			id: "enr-repeat",
			studentId: "student-1",
			classId: "class-1",
			startDate: new Date("2025-03-01T00:00:00.000Z"),
		});
		await setup.db.insert(schema.studentRecords).values({
			id: "rec-missing-context",
			studentId: "student-1",
			meetingId: "meeting-2",
			texto: "Sem contexto",
			createdAt: august,
			updatedAt: august,
		});
		const result = await getStudentHistory(setup.db, "student-1", {});
		const context = result?.eventos.find(
			(event) => event.id === "record:rec-missing-context",
		);
		expect(context?.turmaId).toBe("class-1");

		const meetingLess = await getStudentHistory(setup.db, "student-1", {
			reuniaoId: "missing",
		});
		expect(meetingLess?.eventos).toEqual([]);
	});
});
