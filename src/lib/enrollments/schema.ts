import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";

import { enrollments } from "#/db/schema";

export const enrollmentStatusValues = [
	"ativa",
	"transferida",
	"concluida",
	"cancelada",
] as const;

export type EnrollmentStatus = (typeof enrollmentStatusValues)[number];

export const createEnrollmentSchema = createInsertSchema(enrollments)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		status: createInsertSchema(enrollments).shape.status.default("ativa"),
	})
	.refine(
		(data) =>
			data.endDate === null ||
			data.endDate === undefined ||
			data.endDate >= data.startDate,
		{
			message: "dataTermino deve ser maior ou igual a dataInicio",
			path: ["endDate"],
		},
	);

export const updateEnrollmentSchema = createUpdateSchema(enrollments).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectEnrollmentSchema = createSelectSchema(enrollments);

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type Enrollment = z.infer<typeof selectEnrollmentSchema>;
