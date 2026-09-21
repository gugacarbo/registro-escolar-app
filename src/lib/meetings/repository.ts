import { and, eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import {
	meetingClasses,
	meetingParticipants,
	meetingStudentStatus,
	meetings,
	minutes,
	minuteTemplates,
} from "#/db/schema";
import { defaultMinuteBodyContent } from "#/lib/minutes/tiptap/serializer";

import {
	ERR_INVALID_TRANSITION,
	ERR_MEETING_CLASS_ALREADY_LINKED,
	ERR_MEETING_CLASS_IN_USE,
	ERR_MEETING_FINISHED,
	ERR_MEETING_NOT_FOUND,
	ERR_MEETING_WITHOUT_CLASSES,
	InvalidTransitionError,
	MeetingClassAlreadyLinkedError,
	MeetingClassInUseError,
	MeetingNotEditableError,
	MeetingNotFoundError,
	MeetingWithoutClassesError,
} from "./errors";
import type {
	CreateMeetingInput,
	CreateMeetingParticipantInput,
	TransitionAction,
	UpdateMeetingInput,
} from "./schema";
import { meetingStatusSchema } from "./schema";
import {
	ALLOWED_TRANSITIONS,
	canEditMeetingData,
	NEXT_STATUS,
} from "./transitions";
import type { ListMeetingsOptions } from "./types";

export async function createMeeting(db: DB, input: CreateMeetingInput) {
	const meeting = await db
		.insert(meetings)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
	if (meeting.templateId) {
		await syncMinutePreset(db, meeting.id, meeting.templateId);
	}
	return meeting;
}

export async function updateMeeting(
	db: DB,
	id: string,
	input: UpdateMeetingInput,
) {
	const previous =
		input.templateId !== undefined ? await findMeetingById(db, id) : undefined;
	const meeting = await db
		.update(meetings)
		.set(input)
		.where(eq(meetings.id, id))
		.returning()
		.get();
	if (
		input.templateId !== undefined &&
		previous?.templateId !== meeting.templateId
	) {
		await syncMinutePreset(db, meeting.id, meeting.templateId);
	}
	return meeting;
}

export async function findMeetingById(db: DB, id: string) {
	return db.query.meetings.findFirst({
		where: eq(meetings.id, id),
	});
}

function buildMeetingsWhere(
	options: Pick<ListMeetingsOptions, "search" | "status"> = {},
) {
	const conditions = [];
	const term = options.search?.trim();
	if (term) {
		conditions.push(like(meetings.title, sql`'%' || ${term} || '%'`));
	}
	if (options.status) {
		conditions.push(eq(meetings.status, options.status));
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listMeetings(db: DB, options: ListMeetingsOptions = {}) {
	const { limit = 50, offset = 0, search, status } = options;

	return db.query.meetings.findMany({
		where: buildMeetingsWhere({ search, status }),
		limit,
		offset,
		orderBy: (meetings, { desc }) => [desc(meetings.createdAt)],
	});
}

export async function countMeetings(
	db: DB,
	options: Pick<ListMeetingsOptions, "search" | "status"> = {},
) {
	return db.$count(meetings, buildMeetingsWhere(options));
}

export type CreateMeetingWithRelationsInput = {
	title: string;
	heldAt?: Date | null;
	templateId?: string | null;
	classIds?: string[];
	participants?: Array<
		{ staffId: string; roleIds: string[] } | { staffId: string; roleId: string }
	>;
};

export async function createMeetingWithRelations(
	db: DB,
	input: CreateMeetingWithRelationsInput,
) {
	const meeting = await db
		.insert(meetings)
		.values({
			id: crypto.randomUUID(),
			title: input.title,
			heldAt: input.heldAt ?? null,
			templateId: input.templateId ?? null,
			status: "draft",
		})
		.returning()
		.get();
	if (meeting.templateId) {
		await syncMinutePreset(db, meeting.id, meeting.templateId);
	}

	// Nota: db.transaction não é usado porque DB é a união
	// DrizzleD1Database | BetterSQLite3Database, cujas assinaturas de
	// transaction divergem; os vínculos são gravados sequencialmente
	// logo após a reunião (rascunho nunca fica parcial por API).
	for (const classId of input.classIds ?? []) {
		await db
			.insert(meetingClasses)
			.values({
				id: crypto.randomUUID(),
				meetingId: meeting.id,
				classId,
			})
			.returning()
			.get();
	}
	for (const participant of input.participants ?? []) {
		for (const roleId of "roleIds" in participant
			? participant.roleIds
			: [participant.roleId]) {
			await db
				.insert(meetingParticipants)
				.values({
					id: crypto.randomUUID(),
					meetingId: meeting.id,
					staffId: participant.staffId,
					roleId,
				})
				.returning()
				.get();
		}
	}
	return meeting;
}

async function syncMinutePreset(
	db: DB,
	meetingId: string,
	templateId: string | null,
) {
	const preset = templateId
		? await db.query.minuteTemplates.findFirst({
				where: eq(minuteTemplates.id, templateId),
			})
		: undefined;
	const minute = await db.query.minutes.findFirst({
		where: (rows, { eq }) => eq(rows.meetingId, meetingId),
	});

	const content = preset
		? {
				headerContent: preset.headerContent,
				bodyContent:
					preset.bodyContent ??
					JSON.stringify(
						defaultMinuteBodyContent({
							showMeeting: preset.showMeeting,
							showClasses: preset.showClasses,
							showParticipants: preset.showParticipants,
							showRecords: preset.showRecords,
							showGeneralReports: preset.showGeneralReports,
							showSignatures: preset.showSignatures,
						}),
					),
				footerContent: preset.footerContent,
			}
		: {
				headerContent: null,
				bodyContent: null,
				footerContent: null,
			};

	if (minute) {
		await db
			.update(minutes)
			.set({
				templateId,
				...content,
				approvalStatus: "pendente_aprovacao",
				approvedAt: null,
				approvalNotes: null,
			})
			.where(eq(minutes.id, minute.id))
			.run();
	} else if (preset) {
		await db.insert(minutes).values({
			id: crypto.randomUUID(),
			meetingId,
			templateId,
			...content,
		});
	}
}

export async function listMeetingClasses(db: DB, meetingId: string) {
	return db.query.meetingClasses.findMany({
		where: eq(meetingClasses.meetingId, meetingId),
	});
}

async function findEditableMeeting(db: DB, meetingId: string) {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	if (!canEditMeetingData(meeting.status)) {
		throw new MeetingNotEditableError(ERR_MEETING_FINISHED);
	}
	return meeting;
}

export async function addMeetingClass(
	db: DB,
	meetingId: string,
	classId: string,
) {
	await findEditableMeeting(db, meetingId);
	const existing = await db.query.meetingClasses.findFirst({
		where: and(
			eq(meetingClasses.meetingId, meetingId),
			eq(meetingClasses.classId, classId),
		),
	});
	if (existing) {
		throw new MeetingClassAlreadyLinkedError(ERR_MEETING_CLASS_ALREADY_LINKED);
	}
	return db
		.insert(meetingClasses)
		.values({
			id: crypto.randomUUID(),
			meetingId,
			classId,
		})
		.returning()
		.get();
}

/** Borda 9: turma com acompanhamento registrado não pode ser desvinculada. */
export async function removeMeetingClass(
	db: DB,
	meetingId: string,
	classId: string,
) {
	await findEditableMeeting(db, meetingId);
	const tracked = await db.query.meetingStudentStatus.findFirst({
		where: and(
			eq(meetingStudentStatus.meetingId, meetingId),
			eq(meetingStudentStatus.classId, classId),
		),
	});
	if (tracked) {
		throw new MeetingClassInUseError(ERR_MEETING_CLASS_IN_USE);
	}
	await db
		.delete(meetingClasses)
		.where(
			and(
				eq(meetingClasses.meetingId, meetingId),
				eq(meetingClasses.classId, classId),
			),
		)
		.run();
}

export async function transitionMeeting(
	db: DB,
	id: string,
	action: TransitionAction,
) {
	const meeting = await findMeetingById(db, id);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	const status = meetingStatusSchema.parse(meeting.status);
	if (!ALLOWED_TRANSITIONS[status].includes(action)) {
		throw new InvalidTransitionError(ERR_INVALID_TRANSITION);
	}
	if (action === "start") {
		// Borda 3: reunião sem turmas não pode ser iniciada.
		const linkedClasses = await listMeetingClasses(db, id);
		if (linkedClasses.length === 0) {
			throw new MeetingWithoutClassesError(ERR_MEETING_WITHOUT_CLASSES);
		}
	}
	return updateMeeting(db, id, { status: NEXT_STATUS[action] });
}

export function startMeeting(db: DB, id: string) {
	return transitionMeeting(db, id, "start");
}

export function finalizeMeeting(db: DB, id: string) {
	return transitionMeeting(db, id, "finalize");
}

export function reopenMeeting(db: DB, id: string) {
	return transitionMeeting(db, id, "reopen");
}

export async function createParticipant(
	db: DB,
	input: CreateMeetingParticipantInput & { meetingId: string },
) {
	return db
		.insert(meetingParticipants)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function findParticipant(
	db: DB,
	meetingId: string,
	staffId: string,
	roleId?: string,
) {
	return db.query.meetingParticipants.findFirst({
		where: and(
			eq(meetingParticipants.meetingId, meetingId),
			eq(meetingParticipants.staffId, staffId),
			roleId ? eq(meetingParticipants.roleId, roleId) : undefined,
		),
	});
}

export async function listParticipantsByMeeting(db: DB, meetingId: string) {
	return db.query.meetingParticipants.findMany({
		where: eq(meetingParticipants.meetingId, meetingId),
		orderBy: (meetingParticipants, { desc }) => [
			desc(meetingParticipants.createdAt),
		],
	});
}
