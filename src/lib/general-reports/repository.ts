import { and, asc, eq } from "drizzle-orm";

import type { DB } from "#/db";
import { generalReports, meetingParticipants } from "#/db/schema";
import { findMeetingById } from "#/lib/meetings/repository";
import { canEditLinkedRecord } from "#/lib/meetings/transitions";

import {
	ERR_INVALID_ORIGIN,
	ERR_REPORT_NOT_FOUND,
	ERR_REPORT_NOT_IN_PROGRESS,
	InvalidOriginError,
	MeetingNotInProgressError,
	ReportNotFoundError,
} from "./errors";
import type {
	CreateGeneralReportInput,
	UpdateGeneralReportInput,
} from "./schema";

export type GeneralReportRow = typeof generalReports.$inferSelect;

async function requireEditableMeeting(db: DB, meetingId: string) {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new ReportNotFoundError("Reunião não encontrada");
	}
	// Borda 3: relatos só podem ser criados/editados com a reunião em
	// andamento ou reaberta (canEditLinkedRecord, spec 0005).
	if (
		!canEditLinkedRecord(
			meeting.status as Parameters<typeof canEditLinkedRecord>[0],
		)
	) {
		throw new MeetingNotInProgressError(ERR_REPORT_NOT_IN_PROGRESS);
	}
	return meeting;
}

/** Borda 1: a origem (autor) deve ser participante da própria reunião. */
export async function isParticipantOfMeeting(
	db: DB,
	meetingId: string,
	participantId: string,
): Promise<boolean> {
	const rows = await db.query.meetingParticipants.findMany({
		where: and(
			eq(meetingParticipants.id, participantId),
			eq(meetingParticipants.meetingId, meetingId),
		),
		limit: 1,
	});
	return rows.length > 0;
}

export async function createGeneralReport(
	db: DB,
	input: CreateGeneralReportInput & { meetingId: string },
): Promise<GeneralReportRow> {
	await requireEditableMeeting(db, input.meetingId);
	if (input.originId) {
		const valid = await isParticipantOfMeeting(
			db,
			input.meetingId,
			input.originId,
		);
		if (!valid) {
			throw new InvalidOriginError(ERR_INVALID_ORIGIN);
		}
	}
	return db
		.insert(generalReports)
		.values({
			id: crypto.randomUUID(),
			meetingId: input.meetingId,
			originId: input.originId ?? null,
			categoryId: input.categoryId ?? null,
			texto: input.texto,
			includeInMinutes: input.includeInMinutes ?? true,
		})
		.returning()
		.get();
}

export async function updateGeneralReport(
	db: DB,
	meetingId: string,
	reportId: string,
	input: UpdateGeneralReportInput,
): Promise<GeneralReportRow> {
	await requireEditableMeeting(db, meetingId);
	const current = await findGeneralReportById(db, reportId);
	if (!current || current.meetingId !== meetingId) {
		throw new ReportNotFoundError(ERR_REPORT_NOT_FOUND);
	}
	if (input.originId) {
		const valid = await isParticipantOfMeeting(db, meetingId, input.originId);
		if (!valid) {
			throw new InvalidOriginError(ERR_INVALID_ORIGIN);
		}
	}
	return db
		.update(generalReports)
		.set({
			...(input.texto !== undefined ? { texto: input.texto } : {}),
			...(input.originId !== undefined ? { originId: input.originId } : {}),
			...(input.categoryId !== undefined
				? { categoryId: input.categoryId }
				: {}),
			...(input.includeInMinutes !== undefined
				? { includeInMinutes: input.includeInMinutes }
				: {}),
		})
		.where(eq(generalReports.id, reportId))
		.returning()
		.get();
}

export async function findGeneralReportById(db: DB, reportId: string) {
	return db.query.generalReports.findFirst({
		where: eq(generalReports.id, reportId),
	});
}

export async function listGeneralReportsByMeeting(
	db: DB,
	meetingId: string,
): Promise<GeneralReportRow[]> {
	return db.query.generalReports.findMany({
		where: eq(generalReports.meetingId, meetingId),
		orderBy: [asc(generalReports.createdAt), asc(generalReports.id)],
	});
}
