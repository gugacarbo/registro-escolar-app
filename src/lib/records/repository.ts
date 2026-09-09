import { and, eq, inArray, isNull } from "drizzle-orm";

import type { DB } from "#/db";
import {
	meetingClasses,
	meetingParticipants,
	recordMeetingInclusions,
	studentRecords,
	students,
} from "#/db/schema";

import {
	ERR_INVALID_ORIGIN,
	ERR_RECORD_NOT_FOUND,
	ERR_RECORD_NOT_LINKED_TO_MEETING,
	ERR_STUDENT_NOT_FOUND,
	InvalidOriginError,
	RecordNotFoundError,
	RecordNotLinkedToMeetingError,
} from "./errors";
import type { MeetingStudentRecord } from "./types";

export type StudentRecordRow = typeof studentRecords.$inferSelect;

/** Normaliza nullish do zod (null | undefined) para coluna nullable. */
function toColumn(value: string | null | undefined): string | null {
	const trimmed =
		typeof value === "string" && value.trim() !== "" ? value.trim() : null;
	return trimmed;
}

async function assertStudentExists(db: DB, studentId: string) {
	const rows = await db.query.students.findMany({
		where: eq(students.id, studentId),
		columns: { id: true },
		limit: 1,
	});
	if (rows.length === 0) {
		throw new RecordNotFoundError(ERR_STUDENT_NOT_FOUND);
	}
}

/**
 * Registro independente (sem reunião). `originId` não existe aqui: a autoria
 * só faz sentido como participante de reunião (spec 0007, CA-005).
 */
export async function createIndependentRecord(
	db: DB,
	input: {
		studentId: string;
		texto: string;
		turmaId?: string | null;
		categoriaId?: string | null;
		componenteId?: string | null;
		incluirNaAta?: boolean;
	},
): Promise<StudentRecordRow> {
	await assertStudentExists(db, input.studentId);
	return db
		.insert(studentRecords)
		.values({
			id: crypto.randomUUID(),
			studentId: input.studentId,
			meetingId: null,
			classId: toColumn(input.turmaId),
			componentId: toColumn(input.componenteId),
			originId: null,
			texto: input.texto,
			categoriaId: toColumn(input.categoriaId),
			includeInMinutes: input.incluirNaAta ?? true,
		})
		.returning()
		.get();
}

/**
 * Registro vinculado à reunião (CA-003: vários registros independentes para
 * o mesmo aluno na mesma reunião). Valida que origemId pertence à reunião.
 */
export async function createLinkedRecord(
	db: DB,
	input: {
		meetingId: string;
		studentId: string;
		texto: string;
		categoriaId?: string | null;
		componenteId?: string | null;
		origemId?: string | null;
		incluirNaAta?: boolean;
	},
): Promise<StudentRecordRow> {
	await assertStudentExists(db, input.studentId);
	if (input.origemId) {
		const origin = await db.query.meetingParticipants.findFirst({
			where: and(
				eq(meetingParticipants.id, input.origemId),
				eq(meetingParticipants.meetingId, input.meetingId),
			),
		});
		if (!origin) {
			throw new InvalidOriginError(ERR_INVALID_ORIGIN);
		}
	}
	return db
		.insert(studentRecords)
		.values({
			id: crypto.randomUUID(),
			studentId: input.studentId,
			meetingId: input.meetingId,
			classId: null,
			componentId: toColumn(input.componenteId),
			originId: toColumn(input.origemId),
			texto: input.texto,
			categoriaId: toColumn(input.categoriaId),
			includeInMinutes: input.incluirNaAta ?? true,
		})
		.returning()
		.get();
}

export async function findRecordById(
	db: DB,
	recordId: string,
): Promise<StudentRecordRow | undefined> {
	return db.query.studentRecords.findFirst({
		where: eq(studentRecords.id, recordId),
	});
}

/**
 * Edita registro vinculado à reunião (borda 5: estado da reunião é
 * validado pela rota; aqui garantimos que o registro pertence a ela).
 */
export async function updateLinkedRecord(
	db: DB,
	input: {
		meetingId: string;
		recordId: string;
		texto?: string;
		categoriaId?: string | null;
		componenteId?: string | null;
		origemId?: string | null;
		incluirNaAta?: boolean;
	},
): Promise<StudentRecordRow> {
	const existing = await findRecordById(db, input.recordId);
	if (!existing) {
		throw new RecordNotFoundError(ERR_RECORD_NOT_FOUND);
	}
	if (existing.meetingId !== input.meetingId) {
		throw new RecordNotLinkedToMeetingError(ERR_RECORD_NOT_LINKED_TO_MEETING);
	}
	if (input.origemId) {
		const origin = await db.query.meetingParticipants.findFirst({
			where: and(
				eq(meetingParticipants.id, input.origemId),
				eq(meetingParticipants.meetingId, input.meetingId),
			),
		});
		if (!origin) {
			throw new InvalidOriginError(ERR_INVALID_ORIGIN);
		}
	}

	const set: Partial<typeof studentRecords.$inferInsert> = {};
	if (input.texto !== undefined) {
		set.texto = input.texto;
	}
	if (input.categoriaId !== undefined) {
		set.categoriaId = toColumn(input.categoriaId);
	}
	if (input.componenteId !== undefined) {
		set.componentId = toColumn(input.componenteId);
	}
	if (input.origemId !== undefined) {
		set.originId = toColumn(input.origemId);
	}
	if (input.incluirNaAta !== undefined) {
		set.includeInMinutes = input.incluirNaAta;
	}

	return db
		.update(studentRecords)
		.set(set)
		.where(eq(studentRecords.id, input.recordId))
		.returning()
		.get();
}

/**
 * Define, por reunião, se um registro independente entra na ata (CA-009).
 * Não altera o registro original, apenas record_meeting_inclusions.
 * Upsert atômico via ON CONFLICT (D1 não expõe .transaction()).
 */
export async function setIndependentRecordInclusion(
	db: DB,
	input: { recordId: string; meetingId: string; include: boolean },
) {
	const existing = await findRecordById(db, input.recordId);
	if (!existing) {
		throw new RecordNotFoundError(ERR_RECORD_NOT_FOUND);
	}
	if (existing.meetingId !== null) {
		throw new RecordNotLinkedToMeetingError(
			"Inclusão per-reunião vale apenas para registros independentes",
		);
	}
	return db
		.insert(recordMeetingInclusions)
		.values({
			id: crypto.randomUUID(),
			studentRecordId: input.recordId,
			meetingId: input.meetingId,
			include: input.include,
		})
		.onConflictDoUpdate({
			target: [
				recordMeetingInclusions.studentRecordId,
				recordMeetingInclusions.meetingId,
			],
			set: { include: input.include },
		})
		.returning()
		.get();
}

/**
 * Registros do aluno na reunião: vinculados à reunião + independentes
 * aplicáveis como contexto (bordas 7/8 — o registro independente aparece
 * quando a reunião inclui a turma à qual ele está vinculado; sem turma,
 * aparece para qualquer reunião em que o aluno seja discutido).
 */
export async function listStudentRecordsForMeeting(
	db: DB,
	input: { meetingId: string; studentId: string },
): Promise<MeetingStudentRecord[]> {
	const meetingClassRows = await db.query.meetingClasses.findMany({
		where: eq(meetingClasses.meetingId, input.meetingId),
		columns: { classId: true },
	});
	const meetingClassIds = meetingClassRows.map((row) => row.classId);

	const linkedRows = await db.query.studentRecords.findMany({
		where: and(
			eq(studentRecords.meetingId, input.meetingId),
			eq(studentRecords.studentId, input.studentId),
		),
	});
	const contextRows = await db.query.studentRecords.findMany({
		where: and(
			isNull(studentRecords.meetingId),
			eq(studentRecords.studentId, input.studentId),
		),
	});

	const applicable = contextRows.filter((row) => {
		if (row.classId === null) {
			return true;
		}
		return meetingClassIds.includes(row.classId);
	});

	const inclusionRows =
		applicable.length > 0
			? await db.query.recordMeetingInclusions.findMany({
					where: and(
						eq(recordMeetingInclusions.meetingId, input.meetingId),
						inArray(
							recordMeetingInclusions.studentRecordId,
							applicable.map((row) => row.id),
						),
					),
				})
			: [];
	const includeByRecord = new Map(
		inclusionRows.map((row) => [row.studentRecordId, row.include]),
	);

	const toResult = (
		row: StudentRecordRow,
		scope: "vinculado" | "contexto",
	): MeetingStudentRecord => ({
		id: row.id,
		studentId: row.studentId,
		meetingId: row.meetingId,
		classId: row.classId,
		componentId: row.componentId,
		originId: row.originId,
		texto: row.texto,
		categoriaId: row.categoriaId,
		scope,
		includeInMinutes:
			scope === "vinculado"
				? row.includeInMinutes
				: (includeByRecord.get(row.id) ?? true),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});

	return [
		...linkedRows.map((row) => toResult(row, "vinculado")),
		...applicable.map((row) => toResult(row, "contexto")),
	];
}

/** Lista registros independentes de um aluno (tela de contexto do aluno). */
export async function listIndependentRecordsByStudent(
	db: DB,
	studentId: string,
): Promise<StudentRecordRow[]> {
	return db.query.studentRecords.findMany({
		where: and(
			isNull(studentRecords.meetingId),
			eq(studentRecords.studentId, studentId),
		),
	});
}
