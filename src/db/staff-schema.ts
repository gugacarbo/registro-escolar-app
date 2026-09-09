import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const staff = sqliteTable(
	"staff",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email"),
		phone: text("phone"),
		notes: text("notes"),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("staff_name_idx").on(table.name),
		index("staff_deleted_at_idx").on(table.deletedAt),
	],
);
