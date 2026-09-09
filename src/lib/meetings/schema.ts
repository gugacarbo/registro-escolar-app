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

export const selectMeetingParticipantSchema =
	createSelectSchema(meetingParticipants);

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type Meeting = z.infer<typeof selectMeetingSchema>;
export type CreateMeetingParticipantInput = z.infer<
	typeof createMeetingParticipantSchema
>;
export type MeetingParticipant = z.infer<typeof selectMeetingParticipantSchema>;
