import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import type { DB } from "#/db";
import * as schema from "#/db/schema";

import { classes } from "./classes-schema";
import { meetingClasses, meetings } from "./meetings-schema";

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
			UNIQUE (meeting_id, class_id),
			FOREIGN KEY (meeting_id) REFERENCES meetings(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		);
	`);
	const db = drizzle(sqlite, { schema }) as unknown as DB;
	return { db, sqlite };
}

describe("meetings schema", () => {
	it("templateId aceita null", async () => {
		const { db } = createTestDb();
		const [meeting] = await db
			.insert(meetings)
			.values({ id: "meeting-1", title: "Conselho de classe" })
			.returning();
		expect(meeting.templateId).toBeNull();
		expect(meeting.title).toBe("Conselho de classe");
	});

	it("impede duplicidade de (meetingId, classId) em meeting_classes", async () => {
		const { db } = createTestDb();
		const [meeting] = await db
			.insert(meetings)
			.values({ id: "meeting-1", title: "Reunião 1" })
			.returning();
		const [class1] = await db
			.insert(classes)
			.values({ id: "class-1", name: "1º Ano A", academicPeriod: "2025" })
			.returning();
		await db.insert(meetingClasses).values({
			id: "link-1",
			meetingId: meeting.id,
			classId: class1.id,
		});
		await expect(
			db
				.insert(meetingClasses)
				.values({
					id: "link-2",
					meetingId: meeting.id,
					classId: class1.id,
				})
				.returning(),
		).rejects.toThrow();
	});

	it("permite a mesma turma em reuniões diferentes", async () => {
		const { db } = createTestDb();
		const [first] = await db
			.insert(meetings)
			.values({ id: "meeting-1", title: "Reunião 1" })
			.returning();
		const [second] = await db
			.insert(meetings)
			.values({ id: "meeting-2", title: "Reunião 2" })
			.returning();
		const [class1] = await db
			.insert(classes)
			.values({ id: "class-1", name: "1º Ano A", academicPeriod: "2025" })
			.returning();
		await db.insert(meetingClasses).values({
			id: "link-1",
			meetingId: first.id,
			classId: class1.id,
		});
		const [link] = await db
			.insert(meetingClasses)
			.values({
				id: "link-2",
				meetingId: second.id,
				classId: class1.id,
			})
			.returning();
		expect(link.meetingId).toBe(second.id);
	});
});
