import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { classes } from "./classes-schema";
import { roles } from "./roles-schema";
import { staff } from "./staff-schema";

export const meetings = sqliteTable(
	"meetings",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		status: text("status").notNull().default("draft"),
		heldAt: integer("held_at", { mode: "timestamp_ms" }),
		location: text("location"),
		templateId: text("template_id"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("meetings_status_idx").on(table.status)],
);

export const meetingParticipants = sqliteTable(
	"meeting_participants",
	{
		id: text("id").primaryKey(),
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meetings.id),
		staffId: text("staff_id")
			.notNull()
			.references(() => staff.id),
		roleId: text("role_id")
			.notNull()
			.references(() => roles.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("meeting_participants_meeting_staff_role_uidx").on(
			table.meetingId,
			table.staffId,
			table.roleId,
		),
		index("meeting_participants_meeting_idx").on(table.meetingId),
		index("meeting_participants_staff_idx").on(table.staffId),
		index("meeting_participants_role_idx").on(table.roleId),
	],
);

export const meetingClasses = sqliteTable(
	"meeting_classes",
	{
		id: text("id").primaryKey(),
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meetings.id),
		classId: text("class_id")
			.notNull()
			.references(() => classes.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("meeting_classes_meeting_class_uidx").on(
			table.meetingId,
			table.classId,
		),
		index("meeting_classes_meeting_idx").on(table.meetingId),
		index("meeting_classes_class_idx").on(table.classId),
	],
);

export const meetingParticipantsRelations = relations(
	meetingParticipants,
	({ one }) => ({
		meeting: one(meetings, {
			fields: [meetingParticipants.meetingId],
			references: [meetings.id],
		}),
		staff: one(staff, {
			fields: [meetingParticipants.staffId],
			references: [staff.id],
		}),
		role: one(roles, {
			fields: [meetingParticipants.roleId],
			references: [roles.id],
		}),
	}),
);

export const meetingClassesRelations = relations(meetingClasses, ({ one }) => ({
	meeting: one(meetings, {
		fields: [meetingClasses.meetingId],
		references: [meetings.id],
	}),
	class: one(classes, {
		fields: [meetingClasses.classId],
		references: [classes.id],
	}),
}));
