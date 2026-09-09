import { sql } from "drizzle-orm";
import {
	index,
	integer,
	references,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

import { classes } from "./classes-schema";
import { students } from "./students-schema";

export const enrollments = sqliteTable(
	"enrollments",
	{
		id: text("id").primaryKey(),
		studentId: text("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "no action" }),
		classId: text("class_id")
			.notNull()
			.references(() => classes.id, { onDelete: "no action" }),
		startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
		endDate: integer("end_date", { mode: "timestamp_ms" }),
		status: text("status").notNull().default("ativa"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("enrollments_student_class_idx").on(table.studentId, table.classId),
		index("enrollments_class_start_idx").on(table.classId, table.startDate),
		index("enrollments_student_start_idx").on(table.studentId, table.startDate),
	],
);
