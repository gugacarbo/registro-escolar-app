import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import { createRole } from "#/lib/roles/repository";
import { createStaff } from "#/lib/staff/repository";

import {
	InvalidTransitionError,
	MeetingNotEditableError,
	MeetingNotFoundError,
	MeetingWithoutClassesError,
} from "./errors";
import {
	addMeetingClass,
	countMeetings,
	createMeeting,
	createMeetingWithRelations,
	createParticipant,
	finalizeMeeting,
	findMeetingById,
	findParticipant,
	listMeetingClasses,
	listMeetings,
	listParticipantsByMeeting,
	removeMeetingClass,
	reopenMeeting,
	startMeeting,
	transitionMeeting,
	updateMeeting,
} from "./repository";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE staff (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT,
			phone TEXT,
			notes TEXT,
			default_role_id TEXT,
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
			header_content TEXT,
			body_content TEXT,
			footer_content TEXT,
			approval_status TEXT DEFAULT 'pendente_aprovacao' NOT NULL,
			approved_at INTEGER,
			approval_notes TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id)
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
		CREATE TABLE meeting_participants (
			id TEXT PRIMARY KEY,
			meeting_id TEXT NOT NULL,
			staff_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE (meeting_id, staff_id, role_id)
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
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

async function createTestClass(db: DB, id: string) {
	const [created] = await db
		.insert(schema.classes)
		.values({ id, name: `${id} nome`, academicPeriod: "2025" })
		.returning();
	return created;
}

describe("meetings repository", () => {
	it("cria uma reunião com status rascunho por padrão", async () => {
		const { db } = createTestDb();
		const meeting = await createMeeting(db, { title: "Reunião pedagógica" });
		expect(meeting.title).toBe("Reunião pedagógica");
		expect(meeting.status).toBe("draft");
		expect(meeting.id).toBeTypeOf("string");
	});

	it("atualiza o título da reunião", async () => {
		const { db } = createTestDb();
		const created = await createMeeting(db, { title: "Reunião 1" });
		const updated = await updateMeeting(db, created.id, {
			title: "Reunião 1 atualizada",
		});
		expect(updated.title).toBe("Reunião 1 atualizada");
		expect((await findMeetingById(db, created.id))?.title).toBe(
			"Reunião 1 atualizada",
		);
	});

	it("copia o preset ao criar a reunião e isola a troca de preset", async () => {
		const { db } = createTestDb();
		await db.insert(schema.minuteTemplates).values([
			{ id: "preset-a", name: "Preset A", bodyContent: "Corpo A" },
			{ id: "preset-b", name: "Preset B", bodyContent: "Corpo B" },
		]);

		const meeting = await createMeeting(db, {
			title: "Reunião com preset",
			templateId: "preset-a",
		});
		const first = await db.query.minutes.findFirst();
		expect(first).toMatchObject({
			meetingId: meeting.id,
			templateId: "preset-a",
			bodyContent: "Corpo A",
		});

		await updateMeeting(db, meeting.id, { templateId: "preset-b" });
		const second = await db.query.minutes.findFirst();
		expect(second).toMatchObject({
			templateId: "preset-b",
			bodyContent: "Corpo B",
		});
	});

	it("lista reuniões sem filtro", async () => {
		const { db } = createTestDb();
		await createMeeting(db, { title: "Reunião 1" });
		await createMeeting(db, { title: "Reunião 2" });
		expect(await listMeetings(db)).toHaveLength(2);
	});

	it("encontra reunião por id e lista com busca", async () => {
		const { db } = createTestDb();
		const created = await createMeeting(db, { title: "Conselho de classe" });
		const found = await findMeetingById(db, created.id);
		expect(found?.title).toBe("Conselho de classe");
		const results = await listMeetings(db, { search: "Conselho" });
		expect(results).toHaveLength(1);
	});

	it("filtra reuniões por status", async () => {
		const { db } = createTestDb();
		await createMeeting(db, { title: "Reunião 1", status: "draft" });
		await createMeeting(db, { title: "Reunião 2", status: "finished" });
		expect(await listMeetings(db, { status: "draft" })).toHaveLength(1);
		expect(await listMeetings(db, { status: "finished" })).toHaveLength(1);
		expect(
			await listMeetings(db, { search: "Reunião", status: "draft" }),
		).toHaveLength(1);
	});

	it("conta reuniões combinando busca e status", async () => {
		const { db } = createTestDb();
		await createMeeting(db, { title: "Reunião 1", status: "draft" });
		await createMeeting(db, { title: "Reunião 2", status: "finished" });
		expect(await countMeetings(db, {})).toBe(2);
		expect(await countMeetings(db, { status: "draft" })).toBe(1);
		expect(await countMeetings(db, { search: "Reunião 2" })).toBe(1);
		expect(
			await countMeetings(db, { search: "Reunião", status: "draft" }),
		).toBe(1);
		expect(await countMeetings(db, { search: "  " })).toBe(2);
	});

	it("adiciona participante e impede duplicidade na mesma reunião", async () => {
		const { db } = createTestDb();
		const meeting = await createMeeting(db, { title: "Reunião 1" });
		const member = await createStaff(db, { name: "João Silva" });
		const role = await createRole(db, { name: "Professor" });
		const participant = await createParticipant(db, {
			meetingId: meeting.id,
			staffId: member.id,
			roleId: role.id,
		});
		expect(participant.meetingId).toBe(meeting.id);
		const found = await findParticipant(db, meeting.id, member.id);
		expect(found?.id).toBe(participant.id);
		const listed = await listParticipantsByMeeting(db, meeting.id);
		expect(listed).toHaveLength(1);
		await expect(
			createParticipant(db, {
				meetingId: meeting.id,
				staffId: member.id,
				roleId: role.id,
			}),
		).rejects.toThrow();
	});

	it("permite mais de um papel para o mesmo servidor na reunião", async () => {
		const { db } = createTestDb();
		const meeting = await createMeeting(db, { title: "Reunião 1" });
		const member = await createStaff(db, { name: "João Silva" });
		const professor = await createRole(db, { name: "Professor" });
		const coordenador = await createRole(db, { name: "Coordenador" });

		await createParticipant(db, {
			meetingId: meeting.id,
			staffId: member.id,
			roleId: professor.id,
		});
		await expect(
			createParticipant(db, {
				meetingId: meeting.id,
				staffId: member.id,
				roleId: coordenador.id,
			}),
		).resolves.toMatchObject({ staffId: member.id, roleId: coordenador.id });

		expect(await listParticipantsByMeeting(db, meeting.id)).toHaveLength(2);
	});

	it("permite o mesmo servidor com papéis diferentes em reuniões diferentes", async () => {
		const { db } = createTestDb();
		const first = await createMeeting(db, { title: "Reunião 1" });
		const second = await createMeeting(db, { title: "Reunião 2" });
		const member = await createStaff(db, { name: "Ana Souza" });
		const professor = await createRole(db, { name: "Professor" });
		const direcao = await createRole(db, { name: "Direção" });
		await createParticipant(db, {
			meetingId: first.id,
			staffId: member.id,
			roleId: professor.id,
		});
		const other = await createParticipant(db, {
			meetingId: second.id,
			staffId: member.id,
			roleId: direcao.id,
		});
		expect(other.roleId).toBe(direcao.id);
		expect(await listParticipantsByMeeting(db, first.id)).toHaveLength(1);
		expect(await listParticipantsByMeeting(db, second.id)).toHaveLength(1);
	});
});

describe("meeting lifecycle", () => {
	it("cria reunião em rascunho com turmas e participantes vinculados", async () => {
		const { db } = createTestDb();
		const member = await createStaff(db, { name: "João Silva" });
		const role = await createRole(db, { name: "Professor" });
		const klass = await createTestClass(db, "class-1");
		const meeting = await createMeetingWithRelations(db, {
			title: "Conselho de classe",
			templateId: null,
			classIds: [klass.id],
			participants: [{ staffId: member.id, roleId: role.id }],
		});
		expect(meeting.status).toBe("draft");
		expect(meeting.templateId).toBeNull();
		expect(await listMeetingClasses(db, meeting.id)).toHaveLength(1);
		expect(await listParticipantsByMeeting(db, meeting.id)).toHaveLength(1);
	});

	it("percorre o ciclo completo draft → in_progress → finished → reopened", async () => {
		const { db } = createTestDb();
		const klass = await createTestClass(db, "class-1");
		const meeting = await createMeetingWithRelations(db, {
			title: "Reunião 1",
			classIds: [klass.id],
		});
		const started = await startMeeting(db, meeting.id);
		expect(started.status).toBe("in_progress");
		const finished = await finalizeMeeting(db, meeting.id);
		expect(finished.status).toBe("finished");
		const reopened = await reopenMeeting(db, meeting.id);
		expect(reopened.status).toBe("reopened");
		const restarted = await startMeeting(db, meeting.id);
		expect(restarted.status).toBe("in_progress");
		// Borda 5: não iniciar reunião que já está em andamento.
		await expect(startMeeting(db, meeting.id)).rejects.toThrow(
			InvalidTransitionError,
		);
		const refinished = await finalizeMeeting(db, meeting.id);
		expect(refinished.status).toBe("finished");
	});

	it("bloqueia início de reunião sem turmas (borda 3)", async () => {
		const { db } = createTestDb();
		const meeting = await createMeetingWithRelations(db, {
			title: "Sem turmas",
		});
		await expect(startMeeting(db, meeting.id)).rejects.toThrow(
			MeetingWithoutClassesError,
		);
	});

	it("bloqueia finalize em rascunho e reopen em draft/in_progress", async () => {
		const { db } = createTestDb();
		const klass = await createTestClass(db, "class-1");
		const draft = await createMeetingWithRelations(db, {
			title: "Rascunho",
		});
		await expect(finalizeMeeting(db, draft.id)).rejects.toThrow(
			InvalidTransitionError,
		);
		await expect(reopenMeeting(db, draft.id)).rejects.toThrow(
			InvalidTransitionError,
		);
		const meeting = await createMeetingWithRelations(db, {
			title: "Com turma",
			classIds: [klass.id],
		});
		await startMeeting(db, meeting.id);
		await expect(reopenMeeting(db, meeting.id)).rejects.toThrow(
			InvalidTransitionError,
		);
	});

	it("vincula/remove turma em draft e reopened, bloqueia nos demais estados", async () => {
		const { db } = createTestDb();
		const first = await createTestClass(db, "class-1");
		const second = await createTestClass(db, "class-2");
		const meeting = await createMeetingWithRelations(db, {
			title: "Reunião 1",
			classIds: [first.id],
		});
		const link = await addMeetingClass(db, meeting.id, second.id);
		expect(link.classId).toBe(second.id);
		expect(await listMeetingClasses(db, meeting.id)).toHaveLength(2);
		await startMeeting(db, meeting.id);
		await expect(addMeetingClass(db, meeting.id, first.id)).rejects.toThrow(
			MeetingNotEditableError,
		);
		await finalizeMeeting(db, meeting.id);
		await expect(removeMeetingClass(db, meeting.id, second.id)).rejects.toThrow(
			MeetingNotEditableError,
		);
		await reopenMeeting(db, meeting.id);
		await removeMeetingClass(db, meeting.id, second.id);
		expect(await listMeetingClasses(db, meeting.id)).toHaveLength(1);
	});

	it("erro ao transicionar reunião inexistente", async () => {
		const { db } = createTestDb();
		await expect(transitionMeeting(db, "inexistente", "start")).rejects.toThrow(
			MeetingNotFoundError,
		);
	});

	it("erro ao vincular/remover turma de reunião inexistente", async () => {
		const { db } = createTestDb();
		await expect(addMeetingClass(db, "inexistente", "class-x")).rejects.toThrow(
			MeetingNotFoundError,
		);
		await expect(
			removeMeetingClass(db, "inexistente", "class-x"),
		).rejects.toThrow(MeetingNotFoundError);
	});
});
