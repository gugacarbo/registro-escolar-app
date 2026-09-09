import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const classes = sqliteTable(
	"classes",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		academicPeriod: text("academic_period").notNull(),
		course: text("course"),
		grade: text("grade"),
		shift: text("shift"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("classes_name_idx").on(table.name),
		index("classes_academic_period_idx").on(table.academicPeriod),
	],
);
