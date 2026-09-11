import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import { user } from "#/db/schema";

export const selectUserSchema = createSelectSchema(user);
export const updateRoleSchema = createInsertSchema(user).pick({ role: true });

export type AdminUser = z.infer<typeof selectUserSchema>;
export type UserRole = AdminUser["role"];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
