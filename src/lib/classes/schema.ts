import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

import { classes } from "#/db/schema";

export const createClassSchema = createInsertSchema(classes)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		name: createInsertSchema(classes).shape.name.min(1, "Nome é obrigatório"),
		academicPeriod: createInsertSchema(classes).shape.academicPeriod.min(
			1,
			"Período letivo é obrigatório",
		),
	});

export const updateClassSchema = createUpdateSchema(classes).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectClassSchema = createSelectSchema(classes);

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type Class = z.infer<typeof selectClassSchema>;
