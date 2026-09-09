import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import { createRole } from "#/lib/roles/repository";
import { createStaff } from "#/lib/staff/repository";

import {
	createMeeting,
	createParticipant,
	findMeetingById,
	findParticipant,
	listMeetings,
	listParticipantsByMeeting,
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
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("meetings repository", () => {
	it("cria uma reunião com status rascunho por padrão", async () => {
		const { db } = createTestDb();
		const meeting = await createMeeting(db, { title: "Reunião pedagógica" });
		expect(meeting.title).toBe("Reunião pedagógica");
		expect(meeting.status).toBe("draft");
		expect(meeting.id).toBeTypeOf("string");
	});

	it("encontra reunião por id e lista com busca", async () => {
		const { db } = createTestDb();
		const created = await createMeeting(db, { title: "Conselho de classe" });
		const found = await findMeetingById(db, created.id);
		expect(found?.title).toBe("Conselho de classe");
		const results = await listMeetings(db, { search: "Conselho" });
		expect(results).toHaveLength(1);
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
