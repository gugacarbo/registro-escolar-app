import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { classes } from "./classes-schema";
import { meetings } from "./meetings-schema";
import { students } from "./students-schema";

export const meetingStudentStatus = sqliteTable(
	"meeting_student_status",
	{
		id: text("id").primaryKey(),
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		classId: text("class_id")
			.notNull()
			.references(() => classes.id, { onDelete: "cascade" }),
		studentId: text("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		status: text("status").notNull().default("pendente"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("meeting_student_status_meeting_class_student_uidx").on(
			table.meetingId,
			table.classId,
			table.studentId,
		),
		index("meeting_student_status_meeting_class_idx").on(
			table.meetingId,
			table.classId,
		),
		index("meeting_student_status_meeting_student_idx").on(
			table.meetingId,
			table.studentId,
		),
	],
);

export const meetingStudentStatusRelations = relations(
	meetingStudentStatus,
	({ one }) => ({
		meeting: one(meetings, {
			fields: [meetingStudentStatus.meetingId],
			references: [meetings.id],
		}),
		class: one(classes, {
			fields: [meetingStudentStatus.classId],
			references: [classes.id],
		}),
		student: one(students, {
			fields: [meetingStudentStatus.studentId],
			references: [students.id],
		}),
	}),
);
