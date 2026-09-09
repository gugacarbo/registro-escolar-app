import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

import { students } from "#/db/schema";

export const createStudentSchema = createInsertSchema(students).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const updateStudentSchema = createUpdateSchema(students).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectStudentSchema = createSelectSchema(students);

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type Student = z.infer<typeof selectStudentSchema>;
