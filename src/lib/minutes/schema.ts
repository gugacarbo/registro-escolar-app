import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { minutes, minuteTemplates, minuteVersions } from "#/db/schema";

export const minuteApprovalStatusSchema = z.enum([
	"pendente_aprovacao",
	"aprovada",
]);

// POST /api/minute-templates (spec 0009): campos derivados do Drizzle;
// blocos booleanos com padrão true (cabeçalho/reunião/turmas/participantes/
// registros/relatos/assinaturas/rodapé).
export const createMinuteTemplateSchema = createInsertSchema(minuteTemplates)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
		headerText: z.string().optional().default(""),
		footerText: z.string().optional().default(""),
	});

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
export type MinuteTemplate = z.infer<typeof selectMinuteTemplateSchema>;
export type MinuteApprovalStatus = z.infer<typeof minuteApprovalStatusSchema>;
export type Minute = z.infer<typeof selectMinuteSchema>;
export type MinuteVersion = z.infer<typeof selectMinuteVersionSchema>;
