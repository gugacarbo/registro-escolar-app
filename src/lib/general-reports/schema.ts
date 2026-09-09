import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

import { generalReports } from "#/db/schema";

// Contratos derivados do Drizzle (CONVENTIONS.md); campos de texto recebem
// regra de obrigatoriedade mínima (borda 4: texto vazio é rejeitado).
export const createGeneralReportSchema = createInsertSchema(generalReports)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		meetingId: createInsertSchema(generalReports).shape.meetingId.optional(),
		texto: z.string().trim().min(1, { message: "Texto é obrigatório" }),
		originId: createInsertSchema(generalReports)
			.shape.originId.nullish()
			.transform((value) => (value === "" ? null : value)),
		categoryId: createInsertSchema(generalReports)
			.shape.categoryId.nullish()
			.transform((value) => (value === "" ? null : value)),
		includeInMinutes:
			createInsertSchema(generalReports).shape.includeInMinutes.default(true),
	});

export const updateGeneralReportSchema = createUpdateSchema(generalReports)
	.omit({
		id: true,
		meetingId: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		texto: z.string().trim().min(1, { message: "Texto é obrigatório" }),
	});

export const selectGeneralReportSchema = createSelectSchema(generalReports);

export type CreateGeneralReportInput = z.infer<
	typeof createGeneralReportSchema
>;
export type UpdateGeneralReportInput = z.infer<
	typeof updateGeneralReportSchema
>;
export type GeneralReport = z.infer<typeof selectGeneralReportSchema>;
