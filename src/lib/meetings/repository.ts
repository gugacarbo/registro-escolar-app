import { and, eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { meetingParticipants, meetings } from "#/db/schema";

import type {
	CreateMeetingInput,
	CreateMeetingParticipantInput,
	UpdateMeetingInput,
} from "./schema";
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

export async function listMeetings(db: DB, options: ListMeetingsOptions = {}) {
	const { limit = 50, offset = 0, search } = options;
	const where = search
		? like(meetings.title, sql`'%' || ${search} || '%'`)
		: undefined;

	return db.query.meetings.findMany({
		where,
		limit,
		offset,
		orderBy: (meetings, { desc }) => [desc(meetings.createdAt)],
	});
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
) {
	return db.query.meetingParticipants.findFirst({
		where: and(
			eq(meetingParticipants.meetingId, meetingId),
			eq(meetingParticipants.staffId, staffId),
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
