import { relations, sql } from "drizzle-orm";
import {
	blob,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { meetings } from "./meetings-schema";

// Templates de ata (spec 0009): blocos que o renderizador inclui na
// prévia/PDF. Alterar o template não afeta versões já geradas (CA-009):
// cada versão guarda snapshot próprio do conteúdo renderizado.
export const minuteTemplates = sqliteTable(
	"minute_templates",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		headerContent: text("header_content")
			.notNull()
			.default('{"type":"doc","content":[{"type":"paragraph"}]}'),
		bodyContent: text("body_content"),
		footerContent: text("footer_content")
			.notNull()
			.default('{"type":"doc","content":[{"type":"paragraph"}]}'),
		showMeeting: integer("show_meeting", { mode: "boolean" })
			.notNull()
			.default(true),
		showClasses: integer("show_classes", { mode: "boolean" })
			.notNull()
			.default(true),
		showParticipants: integer("show_participants", { mode: "boolean" })
			.notNull()
			.default(true),
		showRecords: integer("show_records", { mode: "boolean" })
			.notNull()
			.default(true),
		showGeneralReports: integer("show_general_reports", {
			mode: "boolean",
		})
			.notNull()
			.default(true),
		showSignatures: integer("show_signatures", { mode: "boolean" })
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
	(table) => [index("minute_templates_name_idx").on(table.name)],
);

// Ata 1:1 com a reunião (ADR-0014): um único registro lógico por reunião,
// com template selecionado e status de aprovação (spec 0010).
export const minutes = sqliteTable(
	"minutes",
	{
		id: text("id").primaryKey(),
		meetingId: text("meeting_id")
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		templateId: text("template_id").references(() => minuteTemplates.id),
		approvalStatus: text("approval_status")
			.notNull()
			.default("pendente_aprovacao"),
		approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
		approvalNotes: text("approval_notes"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("minutes_meeting_uidx").on(table.meetingId),
		index("minutes_approval_status_idx").on(table.approvalStatus),
	],
);

// Versões imutáveis da ata (spec 0010, CA-008): cada versão guarda o
// snapshot do conteúdo e o próprio PDF (BLOB em D1 para o MVP, sem R2).
export const minuteVersions = sqliteTable(
	"minute_versions",
	{
		id: text("id").primaryKey(),
		minuteId: text("minute_id")
			.notNull()
			.references(() => minutes.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		content: text("content").notNull(),
		pdf: blob("pdf", { mode: "buffer" }),
		isCurrent: integer("is_current", { mode: "boolean" })
			.notNull()
			.default(false),
		notes: text("notes"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("minute_versions_minute_version_uidx").on(
			table.minuteId,
			table.version,
		),
		index("minute_versions_minute_idx").on(table.minuteId),
		index("minute_versions_minute_current_idx").on(
			table.minuteId,
			table.isCurrent,
		),
	],
);

export const minuteTemplatesRelations = relations(
	minuteTemplates,
	({ many }) => ({
		minutes: many(minutes),
	}),
);

export const minutesRelations = relations(minutes, ({ one, many }) => ({
	meeting: one(meetings, {
		fields: [minutes.meetingId],
		references: [meetings.id],
	}),
	template: one(minuteTemplates, {
		fields: [minutes.templateId],
		references: [minuteTemplates.id],
	}),
	versions: many(minuteVersions),
}));

export const minuteVersionsRelations = relations(minuteVersions, ({ one }) => ({
	minute: one(minutes, {
		fields: [minuteVersions.minuteId],
		references: [minutes.id],
	}),
}));
