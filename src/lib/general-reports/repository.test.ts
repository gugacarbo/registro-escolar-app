import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";
import {
	InvalidOriginError,
	MeetingNotInProgressError,
	ReportNotFoundError,
} from "./errors";
import {
	createGeneralReport,
	isParticipantOfMeeting,
	listGeneralReportsByMeeting,
	updateGeneralReport,
} from "./repository";
import { createGeneralReportSchema } from "./schema";

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
		CREATE TABLE staff (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT,
			phone TEXT,
			notes TEXT,
			deleted_at INTEGER,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE meeting_participants (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			staff_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, staff_id)
		);
		CREATE TABLE general_reports (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			origin_id TEXT,
			category_id TEXT,
			texto TEXT NOT NULL,
			include_in_minutes INTEGER DEFAULT true NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE cascade,
			FOREIGN KEY (origin_id) REFERENCES meeting_participants(id) ON DELETE set null
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

async function seedMeeting(
	db: DB,
	id: string,
	status: string,
	withParticipant = true,
) {
	await db
		.insert(schema.meetings)
		.values({ id, title: `Reunião ${id}`, status });
	if (withParticipant) {
		await db
			.insert(schema.staff)
			.values({ id: "staff-1", name: "João Silva" })
			.onConflictDoNothing();
		await db
			.insert(schema.roles)
			.values({ id: "role-1", name: "Professor" })
			.onConflictDoNothing();
		await db
			.insert(schema.meetingParticipants)
			.values({
				id: `participant-${id}`,
				meetingId: id,
				staffId: "staff-1",
				roleId: "role-1",
			})
			.onConflictDoNothing();
	}
}

describe("general reports repository", () => {
	it("valida que a origem é participante da própria reunião", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		await seedMeeting(db, "meeting-2", "in_progress");
		expect(
			await isParticipantOfMeeting(db, "meeting-1", "participant-meeting-1"),
		).toBe(true);
		expect(
			await isParticipantOfMeeting(db, "meeting-2", "participant-meeting-1"),
		).toBe(false);
	});

	it("cria relato com status em andamento e inclui na ata por padrão", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		const report = await createGeneralReport(db, {
			meetingId: "meeting-1",
			texto: "Acolhimento inicial realizado",
			originId: "participant-meeting-1",
			categoryId: null,
			includeInMinutes: true,
		});
		expect(report.meetingId).toBe("meeting-1");
		expect(report.includeInMinutes).toBe(true);
		expect(report.texto).toBe("Acolhimento inicial realizado");
		expect(await listGeneralReportsByMeeting(db, "meeting-1")).toHaveLength(1);
	});

	it("permite reunião reaberta e relato interno (borda 2)", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "reopened");
		const report = await createGeneralReport(db, {
			meetingId: "meeting-1",
			texto: "Relato interno",
			originId: null,
			categoryId: null,
			includeInMinutes: false,
		});
		expect(report.includeInMinutes).toBe(false);
	});

	it("rejeita criação fora de andamento/reaberta (borda 3)", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "draft-1", "draft");
		await expect(
			createGeneralReport(db, {
				meetingId: "draft-1",
				texto: "Qualquer",
				originId: null,
				categoryId: null,
				includeInMinutes: true,
			}),
		).rejects.toBeInstanceOf(MeetingNotInProgressError);
		await expect(
			createGeneralReport(db, {
				meetingId: "inexistente",
				texto: "Qualquer",
				originId: null,
				categoryId: null,
				includeInMinutes: true,
			}),
		).rejects.toBeInstanceOf(ReportNotFoundError);
	});

	it("rejeita autor que não é participante da reunião (borda 1)", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		await expect(
			createGeneralReport(db, {
				meetingId: "meeting-1",
				texto: "Relato",
				originId: "participant-outro",
				categoryId: null,
				includeInMinutes: true,
			}),
		).rejects.toBeInstanceOf(InvalidOriginError);
	});

	it("edita relato enquanto a reunião está em andamento", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		const created = await createGeneralReport(db, {
			meetingId: "meeting-1",
			texto: "Rascunho",
			originId: null,
			categoryId: null,
			includeInMinutes: true,
		});
		const updated = await updateGeneralReport(db, "meeting-1", created.id, {
			texto: "Texto final",
			originId: "participant-meeting-1",
			categoryId: "categoria-a",
			includeInMinutes: false,
		});
		expect(updated.texto).toBe("Texto final");
		expect(updated.originId).toBe("participant-meeting-1");
		expect(updated.includeInMinutes).toBe(false);

		// relato de outra reunião não é acessível pela rota desta
		await seedMeeting(db, "meeting-2", "in_progress");
		await expect(
			updateGeneralReport(db, "meeting-2", created.id, {
				texto: "Inválido",
				originId: null,
				categoryId: null,
				includeInMinutes: true,
			}),
		).rejects.toBeInstanceOf(ReportNotFoundError);
	});

	it("rejeita edição quando a reunião está finalizada (borda 3)", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		const created = await createGeneralReport(db, {
			meetingId: "meeting-1",
			texto: "Relato",
			originId: null,
			categoryId: null,
			includeInMinutes: true,
		});
		await db
			.update(schema.meetings)
			.set({ status: "finished" })
			.where(eq(schema.meetings.id, created.meetingId));
		await expect(
			updateGeneralReport(db, "meeting-1", created.id, {
				texto: "Novo texto",
				originId: null,
				categoryId: null,
				includeInMinutes: true,
			}),
		).rejects.toBeInstanceOf(MeetingNotInProgressError);
	});

	it("usa defaults e converte strings vazias no schema", () => {
		const parsed = createGeneralReportSchema.safeParse({
			meetingId: "meeting-1",
			texto: "Relato",
			originId: "",
			categoryId: "",
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.includeInMinutes).toBe(true);
			expect(parsed.data.originId).toBeNull();
			expect(parsed.data.categoryId).toBeNull();
		}
	});

	it("permite atualização parcial e valida origem na edição", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		const created = await createGeneralReport(db, {
			meetingId: "meeting-1",
			texto: "Original",
			originId: null,
			categoryId: null,
			includeInMinutes: true,
		});
		const updated = await updateGeneralReport(db, "meeting-1", created.id, {
			texto: "Atualizado",
		});
		expect(updated.texto).toBe("Atualizado");
		expect(updated.originId).toBeNull();
		expect(updated.categoryId).toBeNull();
		expect(updated.includeInMinutes).toBe(true);
		await expect(
			updateGeneralReport(db, "meeting-1", created.id, {
				texto: "Inválido",
				originId: "participant-outro",
			}),
		).rejects.toBeInstanceOf(InvalidOriginError);
	});

	it("aplica default no create e atualização sem texto", async () => {
		const { db } = createTestDb();
		await seedMeeting(db, "meeting-1", "in_progress");
		const created = await createGeneralReport(db, {
			meetingId: "meeting-1",
			texto: "Original",
			originId: null,
			categoryId: null,
			includeInMinutes: true,
		});
		expect(created.includeInMinutes).toBe(true);
		const updated = await updateGeneralReport(db, "meeting-1", created.id, {
			texto: "Original",
			originId: null,
			categoryId: "categoria",
			includeInMinutes: false,
		});
		expect(updated.texto).toBe("Original");
		expect(updated.categoryId).toBe("categoria");
		expect(updated.includeInMinutes).toBe(false);
	});
});
