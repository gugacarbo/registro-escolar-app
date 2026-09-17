import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import {
	MeetingDraftError,
	MeetingNotFoundError,
	MinuteAlreadyApprovedError,
	MinuteNotFoundError,
	NoCurrentVersionError,
	PdfNotAvailableError,
} from "./errors";
import { buildMinutePdf, pdfBytesToBuffer } from "./pdf";
import {
	renderedToPlainText,
	renderMinute,
	serializeVersionRow,
} from "./render";
import {
	approveMinute,
	countMinutes,
	createMinuteTemplate,
	findMinuteVersionPdf,
	generateMinuteVersion,
	listMinutes,
	listMinuteVersions,
	previewMinute,
	updateMinuteTemplate,
} from "./repository";
import { textDoc } from "./tiptap/serializer";

const meetingDate = new Date("2025-06-10T12:00:00.000Z");

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE meetings (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			held_at INTEGER,
			location TEXT,
			template_id TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE minute_templates (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			header_content TEXT DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
			body_content TEXT,
			footer_content TEXT DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
			show_meeting INTEGER DEFAULT 1 NOT NULL,
			show_classes INTEGER DEFAULT 1 NOT NULL,
			show_participants INTEGER DEFAULT 1 NOT NULL,
			show_records INTEGER DEFAULT 1 NOT NULL,
			show_general_reports INTEGER DEFAULT 1 NOT NULL,
			show_signatures INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE minutes (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			template_id TEXT,
			approval_status TEXT DEFAULT 'pendente_aprovacao' NOT NULL,
			approved_at INTEGER,
			approval_notes TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE cascade,
			FOREIGN KEY (template_id) REFERENCES minute_templates(id)
		);
		CREATE TABLE minute_versions (
			id TEXT PRIMARY KEY,
			minute_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			content TEXT NOT NULL,
			pdf BLOB,
			is_current INTEGER DEFAULT 0 NOT NULL,
			notes TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (minute_id, version),
			FOREIGN KEY (minute_id) REFERENCES minutes(id) ON DELETE cascade
		);
		CREATE TABLE classes (
			id TEXT PRIMARY KEY, name TEXT NOT NULL, academic_period TEXT NOT NULL,
			course TEXT, grade TEXT, shift TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
		);
		CREATE TABLE meeting_classes (
			id TEXT PRIMARY KEY, meeting_id TEXT NOT NULL, class_id TEXT NOT NULL,
			created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, class_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		);
		CREATE TABLE students (
			id TEXT PRIMARY KEY, name TEXT NOT NULL, reference TEXT, document TEXT, registration_number TEXT,
			email TEXT, phone TEXT, birth_date INTEGER, notes TEXT,
			created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
		);
		CREATE TABLE staff (
			id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, notes TEXT, default_role_id TEXT,
			deleted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
		);
		CREATE TABLE roles (
			id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
		);
		CREATE TABLE meeting_participants (
			id TEXT PRIMARY KEY, meeting_id TEXT NOT NULL, staff_id TEXT NOT NULL, role_id TEXT NOT NULL,
			created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, staff_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (staff_id) REFERENCES staff(id),
			FOREIGN KEY (role_id) REFERENCES roles(id)
		);
		CREATE TABLE student_records (
			id TEXT PRIMARY KEY, student_id TEXT NOT NULL, meeting_id TEXT, class_id TEXT,
			component_id TEXT, origin_id TEXT, texto TEXT NOT NULL, categoria_id TEXT,
			include_in_minutes INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			FOREIGN KEY (student_id) REFERENCES students(id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id),
			FOREIGN KEY (origin_id) REFERENCES meeting_participants(id)
		);
		CREATE TABLE record_meeting_inclusions (
			id TEXT PRIMARY KEY, student_record_id TEXT NOT NULL, meeting_id TEXT NOT NULL,
			include INTEGER DEFAULT 1 NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			UNIQUE (student_record_id, meeting_id),
			FOREIGN KEY (student_record_id) REFERENCES student_records(id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id)
		);
		CREATE TABLE general_reports (
			id TEXT PRIMARY KEY, meeting_id TEXT NOT NULL, origin_id TEXT, category_id TEXT,
			texto TEXT NOT NULL, include_in_minutes INTEGER DEFAULT 1 NOT NULL,
			created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE cascade,
			FOREIGN KEY (origin_id) REFERENCES meeting_participants(id) ON DELETE set null
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

async function seedBase(db: DB) {
	await db.insert(schema.meetings).values([
		{
			id: "meeting-1",
			title: "Conselho 1º Ano",
			status: "in_progress",
			heldAt: meetingDate,
		},
		{ id: "draft-1", title: "Rascunho", status: "draft", heldAt: meetingDate },
	]);
	await db.insert(schema.classes).values([
		{ id: "class-1", name: "1º Ano A", academicPeriod: "2025" },
		{ id: "class-2", name: "2º Ano B", academicPeriod: "2025" },
	]);
	await db
		.insert(schema.meetingClasses)
		.values([{ id: "link-1", meetingId: "meeting-1", classId: "class-1" }]);
	await db.insert(schema.students).values([
		{ id: "student-1", name: "Ana Souza" },
		{ id: "student-2", name: "Bruno Lima" },
	]);
	await db.insert(schema.staff).values({ id: "staff-1", name: "Prof. Lima" });
	await db.insert(schema.roles).values({ id: "role-1", name: "Conselheiro" });
	await db.insert(schema.meetingParticipants).values({
		id: "participant-1",
		meetingId: "meeting-1",
		staffId: "staff-1",
		roleId: "role-1",
	});
}

describe("minutes repository (specs 0009/0010)", () => {
	let setup: ReturnType<typeof createTestDb>;

	beforeEach(async () => {
		setup = createTestDb();
		await seedBase(setup.db);
	});

	it("atualiza template existente", async () => {
		const created = await createMinuteTemplate(setup.db, {
			name: "Original",
			headerContent: textDoc("Cabeçalho original"),
			footerContent: textDoc("Rodapé original"),
		});
		const updated = await updateMinuteTemplate(setup.db, created.id, {
			name: "Atualizado",
			headerContent: textDoc("Novo cabeçalho"),
			footerContent: textDoc("Novo rodapé"),
			showMeeting: false,
			showGeneralReports: true,
		});
		expect(updated).toMatchObject({
			id: created.id,
			name: "Atualizado",
			showMeeting: false,
			showGeneralReports: true,
		});
		expect(
			JSON.parse(updated.headerContent as string).content[0].content[0].text,
		).toBe("Novo cabeçalho");
		expect(
			JSON.parse(updated.footerContent as string).content[0].content[0].text,
		).toBe("Novo rodapé");
	});

	it("cria template e lista ordenado por nome", async () => {
		await createMinuteTemplate(setup.db, { name: "Padrão" });
		const b = await createMinuteTemplate(setup.db, {
			name: "Sem assinaturas",
			showSignatures: false,
			headerContent: textDoc("COLÉGIO X"),
		});
		expect(b.showSignatures).toBe(false);
		const list = await import("./repository").then((m) =>
			m.listMinuteTemplates(setup.db),
		);
		expect(list.map((t) => t.name)).toEqual(["Padrão", "Sem assinaturas"]);
	});

	it("prévia funciona em rascunho (borda 3, spec 0009) e omiti internos (borda 4)", async () => {
		await setup.db.insert(schema.studentRecords).values({
			id: "rec-1",
			studentId: "student-1",
			meetingId: "meeting-1",
			texto: "Interno",
			includeInMinutes: false,
		});
		const preview = await previewMinute(setup.db, "draft-1");
		expect(preview.status).toBe("draft");
		expect(preview.approvalStatus).toBe("pendente_aprovacao");
		expect(preview.content).toContain("RASCUNHO");

		const full = await previewMinute(setup.db, "meeting-1");
		expect(full.content).not.toContain("Interno");
		await setup.db.insert(schema.studentRecords).values([
			{
				id: "indep-class",
				studentId: "student-1",
				classId: "class-1",
				texto: "Contexto turma",
			},
			{
				id: "indep-global",
				studentId: "student-2",
				texto: "Contexto global",
			},
		]);
		const withContext = await previewMinute(setup.db, "meeting-1");
		expect(withContext.content).toContain("Contexto turma");
		expect(withContext.content).toContain("Contexto global");

		// Bordas de template/blocos (spec 0009): alternar cada bloco e validar
		// renderMinimal/maximal e saída em texto plano.
		const template = await createMinuteTemplate(setup.db, {
			name: "Completo",
			headerContent: textDoc("Cabeçalho"),
			footerContent: textDoc("Rodapé"),
		});
		await setup.db
			.update(schema.meetings)
			.set({ templateId: template.id })
			.where(eq(schema.meetings.id, "meeting-1"));
		await setup.db.insert(schema.minutes).values({
			id: "minute-existing",
			meetingId: "meeting-1",
			templateId: template.id,
		});
		const previewWithTemplate = await previewMinute(setup.db, "meeting-1");
		expect(previewWithTemplate.content).toContain("CONSELHO");
		const rendered = renderMinute({
			meeting: {
				id: "m",
				title: "Título",
				status: "in_progress",
				heldAt: null,
				location: null,
				templateId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			template,
			classes: [{ className: "1º A" }],
			participants: [{ staffName: "Prof.", roleName: "Professor" }],
			records: [
				{ className: "1º A", studentName: "Ana", texto: "Registro" },
				{ className: "1º A", studentName: "Ana", texto: "Segundo" },
				{ className: null, studentName: "Bruno", texto: "Sem turma" },
			],
			generalReports: [{ texto: "Relato" }],
		});
		expect(rendered.lines.map((line) => line.text)).toEqual(
			expect.arrayContaining([
				"Cabeçalho",
				"Turmas",
				"1º A",
				"Participantes",
				"Prof. — Professor",
				"1º A",
				"Sem turma",
				"Relatos gerais",
				"Relato",
				"Rodapé",
			]),
		);
		expect(renderedToPlainText(rendered)).toContain("TÍTULO");

		const minimal = renderMinute({
			meeting: {
				id: "m",
				title: "Título",
				status: "draft",
				heldAt: null,
				location: null,
				templateId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			template: {
				...template,
				showMeeting: false,
				showClasses: false,
				showParticipants: false,
				showRecords: false,
				showGeneralReports: false,
				showSignatures: false,
			},
			classes: [],
			participants: [],
			records: [],
			generalReports: [],
		});
		expect(minimal.lines.map((line) => line.text)).toEqual([
			"Cabeçalho",
			"Ata — Título",
			"Rodapé",
		]);
	});

	it("gera v1 com PDF, preserva v1 e marca só a nova como atual (CA-008/borda 5)", async () => {
		const { version } = await generateMinuteVersion(setup.db, "meeting-1");
		expect(version.version).toBe(1);
		expect(version.isCurrent).toBe(true);
		expect(Buffer.isBuffer(version.pdf) && version.pdf.length > 100).toBe(true);

		const v2 = await generateMinuteVersion(setup.db, "meeting-1", {
			notes: "correção",
		});
		expect(v2.version.version).toBe(2);
		const versions = await listMinuteVersions(setup.db, "meeting-1");
		expect(versions).toHaveLength(2);
		expect(versions.filter((v) => v.isCurrent)).toHaveLength(1);
		expect(versions[0]?.version).toBe(2);
		const pdf1 = await findMinuteVersionPdf(setup.db, "meeting-1", 1);
		expect(pdf1.length).toBeGreaterThan(100);
	});

	it("recusa versão oficial em rascunho (borda 3, spec 0009)", async () => {
		await expect(
			generateMinuteVersion(setup.db, "draft-1"),
		).rejects.toBeInstanceOf(MeetingDraftError);
	});

	it("aprova com data automática (borda 4) e volta a pendente ao regenerar (borda 2)", async () => {
		await expect(approveMinute(setup.db, "meeting-1")).rejects.toBeInstanceOf(
			MinuteNotFoundError,
		);
		await generateMinuteVersion(setup.db, "meeting-1");
		const approved = await approveMinute(setup.db, "meeting-1", {
			observacao: "ok",
		});
		expect(approved.approvalStatus).toBe("aprovada");
		expect(approved.approvedAt).toBeInstanceOf(Date);
		await expect(approveMinute(setup.db, "meeting-1")).rejects.toBeInstanceOf(
			MinuteAlreadyApprovedError,
		);
		const regenerated = await generateMinuteVersion(setup.db, "meeting-1");
		expect(regenerated.minute.approvalStatus).toBe("pendente_aprovacao");
		expect(regenerated.minute.approvedAt).toBeNull();
	});

	it("sem versão atual não aprova e PDF de versão inexistente dá 404 (bordas 3/1)", async () => {
		await setup.db.insert(schema.minutes).values({
			id: "minute-x",
			meetingId: "draft-1",
		});
		await expect(approveMinute(setup.db, "draft-1")).rejects.toBeInstanceOf(
			NoCurrentVersionError,
		);
		await expect(
			findMinuteVersionPdf(setup.db, "draft-1", 9),
		).rejects.toBeInstanceOf(Error);
		await expect(
			listMinuteVersions(setup.db, "missing"),
		).rejects.toBeInstanceOf(MinuteNotFoundError);
		expect(PdfNotAvailableError).toBeDefined();
	});

	it("gera PDF válido e cobre paginação/quebra de texto", async () => {
		const longWord = "A".repeat(120);
		const longText = `${longWord} ${"Texto longo com várias palavras ".repeat(120)}`;
		const bytes = await buildMinutePdf({
			title: "Ata — Teste",
			lines: [
				{ text: "Seção", level: 2 },
				{ text: longWord, level: 3 },
				{ text: longText, level: 3 },
				{ text: "", level: 3 },
			],
			elements: [
				{ kind: "line", text: "Seção", level: 2 },
				{ kind: "line", text: longWord, level: 3 },
				{ kind: "line", text: longText, level: 3 },
			],
		});
		expect(bytes.byteLength).toBeGreaterThan(1000);
		expect(Buffer.from(bytes).toString("latin1").startsWith("%PDF-")).toBe(
			true,
		);
	});

	it("sanitiza título com caracteres especiais e gera com título custom", async () => {
		const bytes = await buildMinutePdf(
			{
				title: "Ata — \u201cAspas\u201d e \u2026 elipse \t tab",
				lines: [{ text: "Olá — mundo", level: 1 }],
				elements: [{ kind: "line", text: "Olá — mundo", level: 1 }],
			},
			{
				title: "Título customizado \u201ccom aspas\u201d \u2026",
				generatedAt: "2024-01-01",
			},
		);
		expect(bytes.byteLength).toBeGreaterThan(500);
	});

	it("pdfBytesToBuffer converte Uint8Array com offset", () => {
		const buf = pdfBytesToBuffer(new Uint8Array([1, 2, 3]));
		expect(Buffer.isBuffer(buf)).toBe(true);
		expect(buf.byteLength).toBe(3);
		const withOffset = pdfBytesToBuffer(
			new Uint8Array([9, 9, 1, 2, 3]).subarray(2),
		);
		expect(withOffset.byteLength).toBe(3);
	});

	it("mapeia entidades ausentes", async () => {
		await expect(previewMinute(setup.db, "missing")).rejects.toBeInstanceOf(
			MeetingNotFoundError,
		);
		await expect(
			generateMinuteVersion(setup.db, "missing"),
		).rejects.toBeInstanceOf(MeetingNotFoundError);
		await expect(
			listMinuteVersions(setup.db, "missing"),
		).rejects.toBeInstanceOf(MinuteNotFoundError);
		await expect(
			findMinuteVersionPdf(setup.db, "missing", 1),
		).rejects.toBeInstanceOf(MinuteNotFoundError);
		expect(
			serializeVersionRow({
				id: "v",
				minuteId: "m",
				version: 1,
				content: "x",
				pdf: null,
				isCurrent: true,
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			}).hasPdf,
		).toBe(false);
	});

	it("lista todas as atas com busca por reunião, filtro de status e paginação", async () => {
		const template = await createMinuteTemplate(setup.db, {
			name: "Modelo padrão",
		});
		await setup.db.insert(schema.minutes).values([
			{
				id: "minute-1",
				meetingId: "meeting-1",
				templateId: template.id,
				approvalStatus: "aprovada",
				approvedAt: meetingDate,
				createdAt: meetingDate,
				updatedAt: new Date("2025-07-01T00:00:00.000Z"),
			},
			{
				id: "minute-2",
				meetingId: "draft-1",
				templateId: null,
				approvalStatus: "pendente_aprovacao",
				createdAt: meetingDate,
				updatedAt: new Date("2025-08-01T00:00:00.000Z"),
			},
		]);
		await setup.db.insert(schema.minuteVersions).values({
			id: "version-1",
			minuteId: "minute-1",
			version: 2,
			content: "conteúdo",
			isCurrent: true,
		});

		const all = await listMinutes(setup.db);
		expect(all).toHaveLength(2);
		// Ordenado por updatedAt desc; versão atual refletida via max(version).
		expect(all[0]).toMatchObject({
			id: "minute-2",
			meetingId: "draft-1",
			meetingTitle: "Rascunho",
			templateName: null,
			approvalStatus: "pendente_aprovacao",
			currentVersion: null,
		});
		expect(all[1]).toMatchObject({
			id: "minute-1",
			meetingId: "meeting-1",
			meetingTitle: "Conselho 1º Ano",
			templateName: "Modelo padrão",
			approvalStatus: "aprovada",
			approvedAt: meetingDate.toISOString(),
			currentVersion: 2,
		});

		const bySearch = await listMinutes(setup.db, { search: "conselho" });
		expect(bySearch.map((row) => row.id)).toEqual(["minute-1"]);

		const byStatus = await listMinutes(setup.db, {
			approvalStatus: "aprovada",
		});
		expect(byStatus.map((row) => row.id)).toEqual(["minute-1"]);

		const paged = await listMinutes(setup.db, { limit: 1, offset: 1 });
		expect(paged.map((row) => row.id)).toEqual(["minute-1"]);

		expect(await countMinutes(setup.db)).toBe(2);
		expect(await countMinutes(setup.db, { search: "conselho" })).toBe(1);
		expect(await countMinutes(setup.db, { approvalStatus: "aprovada" })).toBe(
			1,
		);
	});
});
