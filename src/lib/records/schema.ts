import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { studentRecords } from "#/db/schema";

const textoSchema = z
	.string({ message: "Texto é obrigatório" })
	.trim()
	.min(1, "Texto é obrigatório");

// POST /api/students/:id/records — registro independente (spec 0007).
// origemId é rejeitado: autoria só existe como participante de reunião.
export const createIndependentRecordSchema = createInsertSchema(studentRecords)
	.omit({
		id: true,
		studentId: true,
		meetingId: true,
		originId: true,
		includeInMinutes: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		texto: textoSchema,
		turmaId: createInsertSchema(studentRecords).shape.classId.nullish(),
		categoriaId: z.string().min(1).nullish(),
		componenteId:
			createInsertSchema(studentRecords).shape.componentId.nullish(),
		incluirNaAta: z.boolean().optional(),
	})
	.strict();

// POST /api/meetings/:id/students/:studentId/records — registro vinculado.
export const createLinkedRecordSchema = z.object({
	texto: textoSchema,
	categoriaId: z.string().min(1).nullish(),
	componenteId: z.string().min(1).nullish(),
	origemId: z.string().min(1).nullish(),
	incluirNaAta: z.boolean().optional(),
});

// PATCH /api/meetings/:id/records/:recordId — edição de registro vinculado.
export const updateLinkedRecordSchema = z.object({
	texto: textoSchema,
	categoriaId: z.string().min(1).nullish(),
	componenteId: z.string().min(1).nullish(),
	origemId: z.string().min(1).nullish(),
	incluirNaAta: z.boolean().optional(),
});

// PATCH .../records/:recordId/include — decisão per-reunião (CA-009).
export const setRecordInclusionSchema = z.object({
	incluir: z.boolean(),
});

export const updateRecordColumnsSchema = createUpdateSchema(studentRecords);

export type CreateIndependentRecordInput = z.infer<
	typeof createIndependentRecordSchema
>;
export type CreateLinkedRecordInput = z.infer<typeof createLinkedRecordSchema>;
export type UpdateLinkedRecordInput = z.infer<typeof updateLinkedRecordSchema>;
export type SetRecordInclusionInput = z.infer<typeof setRecordInclusionSchema>;
