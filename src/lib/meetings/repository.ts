import { and, eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { meetingClasses, meetingParticipants, meetings } from "#/db/schema";

import {
	ERR_INVALID_TRANSITION,
	ERR_MEETING_FINISHED,
	ERR_MEETING_NOT_FOUND,
	ERR_MEETING_WITHOUT_CLASSES,
	InvalidTransitionError,
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
import { ALLOWED_TRANSITIONS, NEXT_STATUS } from "./transitions";
import type { ListMeetingsOptions } from "./types";

export async function createMeeting(db: DB, input: CreateMeetingInput) {
	return db
		.insert(meetings)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function updateMeeting(
	db: DB,
	id: string,
	input: UpdateMeetingInput,
) {
	return db
		.update(meetings)
		.set(input)
		.where(eq(meetings.id, id))
		.returning()
		.get();
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
	// Turmas só podem ser vinculadas/removidas antes de a reunião
	// começar ou depois de reaberta (draft | reopened).
	if (meeting.status !== "draft" && meeting.status !== "reopened") {
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

export async function removeMeetingClass(
	db: DB,
	meetingId: string,
	classId: string,
) {
	await findEditableMeeting(db, meetingId);
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
