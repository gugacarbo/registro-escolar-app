import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { minutes, minuteTemplates, minuteVersions } from "#/db/schema";

export const minuteApprovalStatusSchema = z.enum([
	"pendente_aprovacao",
	"aprovada",
]);

// POST /api/minute-templates (spec 0009): campos derivados do Drizzle;
// blocos booleanos permanecem aceitos para compatibilidade, enquanto o corpo
// editável é persistido em bodyContent.
export const createMinuteTemplateSchema = createInsertSchema(minuteTemplates)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
		headerContent: z
			.union([
				z.string(),
				z.custom<Record<string, unknown>>((val) => {
					if (typeof val !== "object" || val === null) return false;
					return typeof (val as Record<string, unknown>).type === "string";
				}, "Conteúdo do cabeçalho inválido"),
			])
			.optional(),
		bodyContent: z
			.union([
				z.string(),
				z.custom<Record<string, unknown>>((val) => {
					if (typeof val !== "object" || val === null) return false;
					return typeof (val as Record<string, unknown>).type === "string";
				}, "Conteúdo do corpo inválido"),
			])
			.optional(),
		footerContent: z
			.union([
				z.string(),
				z.custom<Record<string, unknown>>((val) => {
					if (typeof val !== "object" || val === null) return false;
					return typeof (val as Record<string, unknown>).type === "string";
				}, "Conteúdo do rodapé inválido"),
			])
			.optional(),
	});

export const updateMinuteTemplateSchema = createMinuteTemplateSchema;

export const selectMinuteTemplateSchema = createSelectSchema(minuteTemplates);

// POST /api/meetings/:id/minutes/generate — observação opcional da versão.
export const generateMinuteSchema = z.object({
	observacao: z.string().trim().max(2000).optional(),
});

// PATCH /api/meetings/:id/minutes/approve — data automática (borda 4) e
// observação opcional.
export const approveMinuteSchema = z.object({
	data: z.coerce.date().optional(),
	observacao: z.string().trim().max(2000).optional(),
});

export const selectMinuteSchema = createSelectSchema(minutes);
export const selectMinuteVersionSchema = createSelectSchema(minuteVersions);

export type CreateMinuteTemplateInput = z.infer<
	typeof createMinuteTemplateSchema
>;
export type UpdateMinuteTemplateInput = z.infer<
	typeof updateMinuteTemplateSchema
>;
export type MinuteTemplate = z.infer<typeof selectMinuteTemplateSchema>;
export type MinuteApprovalStatus = z.infer<typeof minuteApprovalStatusSchema>;
export type Minute = z.infer<typeof selectMinuteSchema>;
export type MinuteVersion = z.infer<typeof selectMinuteVersionSchema>;
