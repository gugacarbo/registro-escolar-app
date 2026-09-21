import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

import { meetingParticipants, meetings } from "#/db/schema";

export const meetingStatusSchema = z.enum([
	"draft",
	"in_progress",
	"finished",
	"reopened",
]);

export const transitionMeetingSchema = z.enum(["start", "finalize", "reopen"]);

const meetingParticipantApiInputSchema = z
	.object({
		staffId: z.string().min(1),
		roleId: z.string().min(1).optional(),
		roleIds: z.array(z.string().min(1)).optional(),
	})
	.transform(({ staffId, roleId, roleIds }) => ({
		staffId,
		roleIds: roleIds ?? (roleId ? [roleId] : []),
	}))
	.refine((value) => value.roleIds.length > 0, {
		message: "Selecione ao menos um cargo",
		path: ["roleIds"],
	})
	.refine((value) => new Set(value.roleIds).size === value.roleIds.length, {
		message: "Não repita o mesmo cargo",
		path: ["roleIds"],
	});

export const createMeetingSchema = createInsertSchema(meetings)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		title: createInsertSchema(meetings).shape.title.min(
			1,
			"Título é obrigatório",
		),
		status: meetingStatusSchema.optional(),
	});

// Contrato do POST /api/meetings (spec 0005): dados da reunião +
// vínculos de turmas e participantes criados junto com o rascunho.
// Campos extras de API podem usar z.object/z.array; os campos do
// drizzle continuam vindos de createInsertSchema.
export const createMeetingApiSchema = createMeetingSchema.extend({
	// UI envia data ISO (input date); converter para Date antes da validação
	// do timestamp_ms (mesmo padrão de mapEnrollmentRequestToRow).
	heldAt: z.preprocess(
		(value) =>
			typeof value === "string" && value.length > 0 ? new Date(value) : value,
		createInsertSchema(meetings).shape.heldAt,
	),
	classIds: z.array(z.string().min(1)).default([]),
	participants: z.array(meetingParticipantApiInputSchema).default([]),
});

export const updateMeetingSchema = createUpdateSchema(meetings).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const selectMeetingSchema = createSelectSchema(meetings);

export const createMeetingParticipantSchema = createInsertSchema(
	meetingParticipants,
)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		meetingId:
			createInsertSchema(meetingParticipants).shape.meetingId.optional(),
	});

export const createMeetingParticipantApiSchema =
	meetingParticipantApiInputSchema;

export const selectMeetingParticipantSchema =
	createSelectSchema(meetingParticipants);

export type MeetingStatus = z.infer<typeof meetingStatusSchema>;
export type TransitionAction = z.infer<typeof transitionMeetingSchema>;
export type CreateMeetingApiInput = z.infer<typeof createMeetingApiSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type Meeting = z.infer<typeof selectMeetingSchema>;
export type CreateMeetingParticipantInput = z.infer<
	typeof createMeetingParticipantSchema
>;
export type MeetingParticipant = z.infer<typeof selectMeetingParticipantSchema>;
