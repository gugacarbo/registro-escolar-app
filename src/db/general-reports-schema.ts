import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { meetingParticipants, meetings } from "./meetings-schema";

// Relatos gerais da reunião (spec 0008): observações sobre a reunião que não
// se vinculam a estudantes. `originId` aponta para meeting_participants, garantindo
// autoria válida (borda 1); `includeInMinutes` controla a inclusão na ata
// (borda 2 — interno é armazenado e omitido na ata/PDF).
export const generalReports = sqliteTable(
	"general_reports",
	{
		id: text("id").primaryKey(),
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		originId: text("origin_id").references(() => meetingParticipants.id, {
			onDelete: "set null",
		}),
		categoryId: text("category_id"),
		texto: text("texto").notNull(),
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
		index("general_reports_meeting_idx").on(table.meetingId),
		index("general_reports_meeting_minutes_idx").on(
			table.meetingId,
			table.includeInMinutes,
		),
		index("general_reports_origin_idx").on(table.originId),
	],
);

export const generalReportsRelations = relations(generalReports, ({ one }) => ({
	meeting: one(meetings, {
		fields: [generalReports.meetingId],
		references: [meetings.id],
	}),
	origin: one(meetingParticipants, {
		fields: [generalReports.originId],
		references: [meetingParticipants.id],
	}),
}));
