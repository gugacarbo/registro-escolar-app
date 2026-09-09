import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

import { meetingStudentStatus } from "#/db/schema";

export const trackingStatusValues = [
	"pendente",
	"em_discussao",
	"concluido",
	"nao_discutido",
] as const;

export type TrackingStatus = (typeof trackingStatusValues)[number];

export const trackingStatusSchema = z.enum(trackingStatusValues);

export const updateStudentStatusSchema = createUpdateSchema(
	meetingStudentStatus,
)
	.omit({
		id: true,
		meetingId: true,
		classId: true,
		studentId: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		status: trackingStatusSchema,
		classId: createInsertSchema(meetingStudentStatus).shape.classId.min(
			1,
			"Turma é obrigatória",
		),
	});

export const selectMeetingStudentStatusSchema =
	createSelectSchema(meetingStudentStatus);

export const createMeetingStudentStatusSchema = createInsertSchema(
	meetingStudentStatus,
)
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		status:
			createInsertSchema(meetingStudentStatus).shape.status.default("pendente"),
	});

export type UpdateStudentStatusInput = z.infer<
	typeof updateStudentStatusSchema
>;
export type CreateMeetingStudentStatusInput = z.infer<
	typeof createMeetingStudentStatusSchema
>;
export type MeetingStudentStatus = z.infer<
	typeof selectMeetingStudentStatusSchema
>;
