import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const students = sqliteTable(
	"students",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		reference: text("reference"),
		document: text("document"),
		registrationNumber: text("registration_number"),
		email: text("email"),
		phone: text("phone"),
		birthDate: integer("birth_date", { mode: "timestamp_ms" }),
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
		index("students_name_idx").on(table.name),
		index("students_document_idx").on(table.document),
	],
);
