import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

import { components } from "#/db/schema";

export const createComponentSchema = createInsertSchema(components)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		name: createInsertSchema(components).shape.name.min(1, "Nome é obrigatório"),
	});

export const updateComponentSchema = createUpdateSchema(components).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectComponentSchema = createSelectSchema(components);

export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
export type Component = z.infer<typeof selectComponentSchema>;
