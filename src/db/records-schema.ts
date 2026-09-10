import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { classes } from "./classes-schema";
import { components } from "./components-schema";
import { meetingParticipants, meetings } from "./meetings-schema";
import { students } from "./students-schema";

// Registros de estudante (spec 0007): múltiplos registros independentes sobre
// um estudante, com ou sem reunião. `originId` aponta para meeting_participants
// (participação na reunião), garantindo autoria válida (CA-005) — por isso a
// origem só existe em registros vinculados a reunião.
export const studentRecords = sqliteTable(
	"student_records",
	{
		id: text("id").primaryKey(),
		studentId: text("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		meetingId: text("meeting_id").references(() => meetings.id, {
			onDelete: "cascade",
		}),
		classId: text("class_id").references(() => classes.id, {
			onDelete: "set null",
		}),
		componentId: text("component_id").references(() => components.id, {
			onDelete: "set null",
		}),
		originId: text("origin_id").references(() => meetingParticipants.id, {
			onDelete: "set null",
		}),
		texto: text("texto").notNull(),
		categoriaId: text("categoria_id"),
		includeInMinutes: integer("include_in_minutes", { mode: "boolean" })
			.notNull()
			.default(true),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("student_records_student_idx").on(table.studentId),
		index("student_records_meeting_student_idx").on(
			table.meetingId,
			table.studentId,
		),
		index("student_records_meeting_idx").on(table.meetingId),
		index("student_records_class_idx").on(table.classId),
	],
);

// Inclusão por reunião de um registro independente na ata (spec 0007, CA-009):
// desmarcar afeta apenas a ata daquela reunião, nunca o registro original.
export const recordMeetingInclusions = sqliteTable(
	"record_meeting_inclusions",
	{
		id: text("id").primaryKey(),
		studentRecordId: text("student_record_id")
			.notNull()
			.references(() => studentRecords.id, { onDelete: "cascade" }),
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		include: integer("include", { mode: "boolean" }).notNull().default(true),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("record_meeting_inclusions_record_meeting_uidx").on(
			table.studentRecordId,
			table.meetingId,
		),
		index("record_meeting_inclusions_meeting_idx").on(table.meetingId),
	],
);

export const studentRecordsRelations = relations(studentRecords, ({ one }) => ({
	student: one(students, {
		fields: [studentRecords.studentId],
		references: [students.id],
	}),
	meeting: one(meetings, {
		fields: [studentRecords.meetingId],
		references: [meetings.id],
	}),
	class: one(classes, {
		fields: [studentRecords.classId],
		references: [classes.id],
	}),
	component: one(components, {
		fields: [studentRecords.componentId],
		references: [components.id],
	}),
	origin: one(meetingParticipants, {
		fields: [studentRecords.originId],
		references: [meetingParticipants.id],
	}),
}));

export const recordMeetingInclusionsRelations = relations(
	recordMeetingInclusions,
	({ one }) => ({
		studentRecord: one(studentRecords, {
			fields: [recordMeetingInclusions.studentRecordId],
			references: [studentRecords.id],
		}),
		meeting: one(meetings, {
			fields: [recordMeetingInclusions.meetingId],
			references: [meetings.id],
		}),
	}),
);
