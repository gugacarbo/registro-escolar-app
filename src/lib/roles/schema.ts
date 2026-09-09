import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

import { roles } from "#/db/schema";

export const createRoleSchema = createInsertSchema(roles)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		name: createInsertSchema(roles).shape.name.min(1, "Nome é obrigatório"),
	});

export const updateRoleSchema = createUpdateSchema(roles).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectRoleSchema = createSelectSchema(roles);

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type Role = z.infer<typeof selectRoleSchema>;
