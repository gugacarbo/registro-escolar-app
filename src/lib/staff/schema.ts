import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

import { staff } from "#/db/schema";

export const createStaffSchema = createInsertSchema(staff)
	.omit({
		id: true,
		deletedAt: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		name: createInsertSchema(staff).shape.name.min(1, "Nome é obrigatório"),
	});

export const updateStaffSchema = createUpdateSchema(staff).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectStaffSchema = createSelectSchema(staff);

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffMember = z.infer<typeof selectStaffSchema>;
