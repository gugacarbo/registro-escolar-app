import { and, eq, lte, sql } from "drizzle-orm";

import type { DB } from "#/db";
import {
	enrollments,
	meetingClasses,
	meetingStudentStatus,
	meetings,
} from "#/db/schema";

import { type TrackingStatus, trackingStatusValues } from "./schema";
import type {
	MeetingClassStudent,
	MeetingClassStudentsResult,
	MeetingProgress,
	TrackingCounters,
} from "./types";

export type MeetingStudentStatusRow = typeof meetingStudentStatus.$inferSelect;

function activeOnDate(dateMs: number) {
	return and(
		lte(enrollments.startDate, new Date(dateMs)),
		sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${dateMs})`,
	);
}

function toTrackingStatus(value: string | undefined): TrackingStatus {
	return trackingStatusValues.includes(value as TrackingStatus)
		? (value as TrackingStatus)
		: "pendente";
}

function emptyCounters(): TrackingCounters {
	return {
		total: 0,
		pendente: 0,
		em_discussao: 0,
		concluido: 0,
		nao_discutido: 0,
	};
}

/**
 * Lista os estudantes vinculados à turma na data da reunião (ADR-0015, sem
 * snapshots) com o status de acompanhamento; ausência de registro significa
 * "pendente".
 */
export async function listStudentsWithStatus(
	db: DB,
	{
		meetingId,
		classId,
		dateMs,
	}: { meetingId: string; classId: string; dateMs: number },
): Promise<MeetingClassStudentsResult> {
	const enrollmentRows = await db.query.enrollments.findMany({
		where: and(eq(enrollments.classId, classId), activeOnDate(dateMs)),
		with: { student: true },
	});
	const statusRows = await db.query.meetingStudentStatus.findMany({
		where: and(
			eq(meetingStudentStatus.meetingId, meetingId),
			eq(meetingStudentStatus.classId, classId),
		),
	});
	const statusByStudent = new Map(
		statusRows.map((row) => [row.studentId, row]),
	);

	const list: MeetingClassStudent[] = enrollmentRows.map((row) => {
		const statusRow = statusByStudent.get(row.studentId);
		return {
			studentId: row.studentId,
			name: row.student.name,
			document: row.student.document,
			registrationNumber: row.student.registrationNumber,
			status: toTrackingStatus(statusRow?.status),
			statusUpdatedAt: statusRow?.updatedAt ?? null,
		};
	});
	list.sort((a, b) => a.name.localeCompare(b.name));

	const counters = emptyCounters();
	for (const student of list) {
		counters.total += 1;
		counters[student.status] += 1;
	}

	const nextPending = list.find((student) => student.status === "pendente");

	return {
		students: list,
		counters,
		nextPendingStudentId: nextPending?.studentId ?? null,
	};
}

export async function isClassLinkedToMeeting(
	db: DB,
	meetingId: string,
	classId: string,
): Promise<boolean> {
	const rows = await db.query.meetingClasses.findMany({
		where: and(
			eq(meetingClasses.meetingId, meetingId),
			eq(meetingClasses.classId, classId),
		),
		limit: 1,
	});
	return rows.length > 0;
}

export async function isStudentEnrolledInClassAtDate(
	db: DB,
	{
		studentId,
		classId,
		dateMs,
	}: { studentId: string; classId: string; dateMs: number },
): Promise<boolean> {
	const rows = await db.query.enrollments.findMany({
		where: and(
			eq(enrollments.studentId, studentId),
			eq(enrollments.classId, classId),
			activeOnDate(dateMs),
		),
		limit: 1,
	});
	return rows.length > 0;
}

/**
 * Cria ou atualiza o status de acompanhamento do estudante na turma da reunião.
 * D1 não expõe .transaction(): upsert atômico via ON CONFLICT no índice
 * único (meeting_id, class_id, student_id).
 */
export async function upsertStudentStatus(
	db: DB,
	{
		meetingId,
		classId,
		studentId,
		status,
	}: {
		meetingId: string;
		classId: string;
		studentId: string;
		status: TrackingStatus;
	},
): Promise<MeetingStudentStatusRow> {
	return db
		.insert(meetingStudentStatus)
		.values({ id: crypto.randomUUID(), meetingId, classId, studentId, status })
		.onConflictDoUpdate({
			target: [
				meetingStudentStatus.meetingId,
				meetingStudentStatus.classId,
				meetingStudentStatus.studentId,
			],
			set: { status },
		})
		.returning()
		.get();
}

export async function findStudentStatus(
	db: DB,
	{
		meetingId,
		classId,
		studentId,
	}: { meetingId: string; classId: string; studentId: string },
): Promise<MeetingStudentStatusRow | undefined> {
	return db.query.meetingStudentStatus.findFirst({
		where: and(
			eq(meetingStudentStatus.meetingId, meetingId),
			eq(meetingStudentStatus.classId, classId),
			eq(meetingStudentStatus.studentId, studentId),
		),
	});
}

/**
 * Progresso geral da reunião: estudantes vinculados às turmas da reunião na data
 * da reunião (regra temporal da ADR-0015) e marcados como concluídos.
 */
export async function getMeetingProgress(
	db: DB,
	meetingId: string,
): Promise<MeetingProgress> {
	const meeting = await db.query.meetings.findFirst({
		where: eq(meetings.id, meetingId),
	});
	const dateMs =
		(meeting?.heldAt ?? meeting?.createdAt)?.getTime() ?? Date.now();

	const links = await db.query.meetingClasses.findMany({
		where: eq(meetingClasses.meetingId, meetingId),
	});
	const enrolledPairs = new Set<string>();
	for (const link of links) {
		const rows = await db.query.enrollments.findMany({
			where: and(eq(enrollments.classId, link.classId), activeOnDate(dateMs)),
			columns: { studentId: true },
		});
		for (const row of rows) {
			enrolledPairs.add(`${link.classId}:${row.studentId}`);
		}
	}

	const statuses = await db.query.meetingStudentStatus.findMany({
		where: eq(meetingStudentStatus.meetingId, meetingId),
		columns: { classId: true, studentId: true, status: true },
	});

	const total = enrolledPairs.size;
	let concluded = 0;
	for (const statusRow of statuses) {
		if (
			statusRow.status === "concluido" &&
			enrolledPairs.has(`${statusRow.classId}:${statusRow.studentId}`)
		) {
			concluded += 1;
		}
	}
	const percentage = total === 0 ? 0 : Math.round((concluded / total) * 100);

	return {
		total,
		concluded,
		percentage,
		completed: total > 0 && concluded === total,
	};
}
