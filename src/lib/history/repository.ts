import { eq, inArray, sql } from "drizzle-orm";

import type { DB } from "#/db";
import {
	enrollments,
	generalReports,
	meetingClasses,
	meetingStudentStatus,
	meetings,
	studentRecords,
	students,
} from "#/db/schema";
import { findClassById } from "#/lib/classes/repository";
import { findStudentById } from "#/lib/students/repository";

import type { HistoryQuery } from "./schema";
import type {
	ClassHistoryResult,
	ClassHistoryStudent,
	HistoryEvent,
	StudentHistoryResult,
} from "./types";

/**
 * Histórico do aluno (spec 0011) e da turma (spec 0012), compondo eventos de
 * matrículas, reuniões, registros, statuses e relatos gerais — ADR-0015:
 * composição temporal via vínculos (startDate/endDate), sem snapshots.
 */

type RecordRow = typeof studentRecords.$inferSelect;
type ReportRow = typeof generalReports.$inferSelect;
type EnrollmentRow = typeof enrollments.$inferSelect;
type MeetingRow = typeof meetings.$inferSelect;

function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(query: string | undefined, ...fields: (string | null)[]) {
	if (!query) {
		return true;
	}
	const needle = normalize(query);
	return fields.some(
		(field) => field !== null && normalize(field).includes(needle),
	);
}

/** Data de referência da reunião (ADR-0015): heldAt, senão createdAt. */
function meetingDate(meeting: MeetingRow): Date {
	return meeting.heldAt ?? meeting.createdAt;
}

function isActiveOn(enrollment: EnrollmentRow, dateMs: number): boolean {
	return (
		enrollment.startDate.getTime() <= dateMs &&
		(enrollment.endDate === null || enrollment.endDate.getTime() >= dateMs)
	);
}

/** Turma contextual do registro (CA-007): classId próprio, senão null. */ function recordEvent(
	record: RecordRow,
	meeting: MeetingRow | undefined,
	turma: { id: string; name: string } | null,
	studentName: string | null,
): HistoryEvent {
	return {
		id: `record:${record.id}`,
		tipo: "registro",
		data: (record.meetingId && meeting
			? meetingDate(meeting)
			: record.createdAt
		).toISOString(),
		studentId: record.studentId,
		studentName,
		turmaId: turma?.id ?? record.classId,
		turmaNome: turma?.name ?? null,
		reuniaoId: record.meetingId,
		reuniaoTitulo: meeting?.title ?? null,
		reuniaoStatus: meeting?.status ?? null,
		texto: record.texto,
		categoriaId: record.categoriaId,
		componenteId: record.componentId,
		includeInMinutes: record.includeInMinutes,
		// Borda 4 (0011) / borda 5 (0012): interno entra no histórico.
		interno: !record.includeInMinutes,
		metadata: {
			scope: record.meetingId ? "vinculado" : "independente",
		},
	};
}

function sortEvents(events: HistoryEvent[]): HistoryEvent[] {
	return events.sort((a, b) => {
		if (a.data !== b.data) {
			return a.data < b.data ? -1 : 1;
		}
		return a.id < b.id ? -1 : 1;
	});
}

function filterEvents(
	events: HistoryEvent[],
	query: HistoryQuery,
): HistoryEvent[] {
	return events.filter((event) => {
		if (query.turmaId && event.turmaId !== query.turmaId) {
			return false;
		}
		if (query.reuniaoId && event.reuniaoId !== query.reuniaoId) {
			return false;
		}
		if (query.categoriaId && event.categoriaId !== query.categoriaId) {
			return false;
		}
		if (query.componenteId && event.componenteId !== query.componenteId) {
			return false;
		}
		if (query.alunoId && event.studentId !== query.alunoId) {
			return false;
		}
		if (
			!matchesQuery(
				query.q,
				event.texto,
				event.reuniaoTitulo,
				event.turmaNome,
				event.studentName,
			)
		) {
			return false;
		}
		return true;
	});
}

/** Eventos de matrícula (início/fim do vínculo) + eventos de reunião/turma compartilhados. */
async function composeStudentEvents(
	db: DB,
	studentId: string,
	studentName: string | null,
): Promise<{
	events: HistoryEvent[];
	classes: Map<string, { id: string; name: string; academicPeriod: string }>;
}> {
	const classRows = await db.query.classes.findMany();
	const classById = new Map(
		classRows.map((row) => [
			row.id,
			{ id: row.id, name: row.name, academicPeriod: row.academicPeriod },
		]),
	);

	// Matrículas: início e (se houver) encerramento do vínculo (CA-001).
	const enrollmentRows = await db.query.enrollments.findMany({
		where: eq(enrollments.studentId, studentId),
	});
	const events: HistoryEvent[] = [];
	for (const enrollment of enrollmentRows) {
		const turma = classById.get(enrollment.classId) ?? null;
		events.push({
			id: `matricula:${enrollment.id}`,
			tipo: "matricula",
			data: enrollment.startDate.toISOString(),
			studentId,
			studentName,
			turmaId: enrollment.classId,
			turmaNome: turma?.name ?? null,
			reuniaoId: null,
			reuniaoTitulo: null,
			reuniaoStatus: null,
			texto: null,
			categoriaId: null,
			componenteId: null,
			includeInMinutes: null,
			interno: false,
			metadata: { status: enrollment.status },
		});
		if (enrollment.endDate) {
			events.push({
				id: `encerramento:${enrollment.id}`,
				tipo: "encerramento_matricula",
				data: enrollment.endDate.toISOString(),
				studentId,
				studentName,
				turmaId: enrollment.classId,
				turmaNome: turma?.name ?? null,
				reuniaoId: null,
				reuniaoTitulo: null,
				reuniaoStatus: null,
				texto: null,
				categoriaId: null,
				componenteId: null,
				includeInMinutes: null,
				interno: false,
				metadata: { status: enrollment.status },
			});
		}
	}

	// Reuniões das turmas do aluno + registros do aluno nessas reuniões.
	const classIds = [...new Set(enrollmentRows.map((row) => row.classId))];
	const meetingIds = new Set<string>();
	if (classIds.length > 0) {
		const links = await db.query.meetingClasses.findMany({
			where: inArray(meetingClasses.classId, classIds),
		});
		for (const link of links) {
			meetingIds.add(link.meetingId);
		}
	}

	const records = await db.query.studentRecords.findMany({
		where: eq(studentRecords.studentId, studentId),
	});
	// Registros vinculados a reuniões fora das turmas também pertencem ao histórico.
	for (const record of records) {
		if (record.meetingId) {
			meetingIds.add(record.meetingId);
		}
	}

	const meetingRows =
		meetingIds.size > 0
			? await db.query.meetings.findMany({
					where: inArray(meetings.id, [...meetingIds]),
				})
			: [];
	const meetingById = new Map(meetingRows.map((row) => [row.id, row]));

	// Statuses do aluno nas reuniões (em discussão / concluído).
	const statusRows = await db.query.meetingStudentStatus.findMany({
		where: eq(meetingStudentStatus.studentId, studentId),
	});
	const activeEnrollmentByClass = new Map<string, EnrollmentRow>();
	for (const enrollment of enrollmentRows) {
		const current = activeEnrollmentByClass.get(enrollment.classId);
		if (!current || enrollment.startDate > current.startDate) {
			activeEnrollmentByClass.set(enrollment.classId, enrollment);
		}
	}
	for (const statusRow of statusRows) {
		const meeting = meetingById.get(statusRow.meetingId);
		const enrollment = activeEnrollmentByClass.get(statusRow.classId);
		if (!meeting || !enrollment) {
			continue;
		}
		// ADR-0015: status vale para quem estava vinculado na data da reunião.
		if (!isActiveOn(enrollment, meetingDate(meeting).getTime())) {
			continue;
		}
		const turma = classById.get(statusRow.classId) ?? null;
		events.push({
			id: `status:${statusRow.id}`,
			tipo: "status_reuniao",
			data: statusRow.updatedAt.toISOString(),
			studentId,
			studentName,
			turmaId: statusRow.classId,
			turmaNome: turma?.name ?? null,
			reuniaoId: statusRow.meetingId,
			reuniaoTitulo: meeting.title,
			reuniaoStatus: meeting.status,
			texto: null,
			categoriaId: null,
			componenteId: null,
			includeInMinutes: null,
			interno: false,
			metadata: { status: statusRow.status },
		});
	}

	// Registros do aluno (inclui internos — borda 4 da 0011).
	for (const record of records) {
		const meeting = record.meetingId
			? meetingById.get(record.meetingId)
			: undefined;
		let turma: { id: string; name: string } | null = null;
		if (record.classId) {
			turma = classById.get(record.classId) ?? null;
		}
		if (!turma && meeting) {
			// CA-007: contexto da turma do aluno naquela data.
			const dateMs = meetingDate(meeting).getTime();
			const enrollment = enrollmentRows.find((row) => isActiveOn(row, dateMs));
			turma = enrollment ? (classById.get(enrollment.classId) ?? null) : null;
		}
		events.push(recordEvent(record, meeting, turma, studentName));
	}

	return { events, classes: classById };
}

/** GET /api/students/:id/history (spec 0011). */
export async function getStudentHistory(
	db: DB,
	studentId: string,
	query: HistoryQuery,
): Promise<StudentHistoryResult | null> {
	const student = await findStudentById(db, studentId);
	if (!student) {
		return null;
	}
	const { events, classes } = await composeStudentEvents(
		db,
		studentId,
		student.name,
	);

	let filtered = filterEvents(events, query);
	if (query.periodo) {
		// Período letivo: filtra pela turma daquele período (borda CA-001).
		const classIdsOfPeriod = new Set(
			[...classes.values()]
				.filter((row) => row.academicPeriod === query.periodo)
				.map((row) => row.id),
		);
		filtered = filtered.filter(
			(event) => event.turmaId === null || classIdsOfPeriod.has(event.turmaId),
		);
	}

	return {
		aluno: {
			id: student.id,
			name: student.name,
			document: student.document,
			registrationNumber: student.registrationNumber,
		},
		eventos: sortEvents(filtered),
	};
}

/** GET /api/classes/:id/history (spec 0012). */
export async function getClassHistory(
	db: DB,
	classId: string,
	query: HistoryQuery,
): Promise<ClassHistoryResult | null> {
	const classRow = await findClassById(db, classId);
	if (!classRow) {
		return null;
	}

	// Borda 2: alunos históricos (vínculos encerrados inclusos, com status).
	const enrollmentRows = await db.query.enrollments.findMany({
		where: eq(enrollments.classId, classId),
		with: { student: true },
	});
	const alunos: ClassHistoryStudent[] = enrollmentRows
		.map((row) => ({
			studentId: row.student.id,
			name: row.student.name,
			status: row.status,
			startDate: row.startDate.toISOString(),
			endDate: row.endDate ? row.endDate.toISOString() : null,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	// Reuniões vinculadas à turma (borda 1: pode ser vazia).
	const links = await db.query.meetingClasses.findMany({
		where: eq(meetingClasses.classId, classId),
	});
	const meetingRows =
		links.length > 0
			? await db.query.meetings.findMany({
					where: inArray(
						meetings.id,
						links.map((link) => link.meetingId),
					),
				})
			: [];
	const meetingById = new Map(meetingRows.map((row) => [row.id, row]));

	const events: HistoryEvent[] = [];
	for (const meeting of meetingRows) {
		events.push({
			id: `reuniao:${meeting.id}`,
			tipo: "reuniao",
			data: meetingDate(meeting).toISOString(),
			studentId: null,
			studentName: null,
			turmaId: classId,
			turmaNome: classRow.name,
			reuniaoId: meeting.id,
			reuniaoTitulo: meeting.title,
			reuniaoStatus: meeting.status,
			texto: null,
			categoriaId: null,
			componenteId: null,
			includeInMinutes: null,
			interno: false,
			metadata: {},
		});
	}

	// Registros: vinculados a reuniões da turma ou independentes da turma.
	const recordRows = await db.query.studentRecords.findMany({
		where: sql`${studentRecords.classId} = ${classId} OR ${studentRecords.meetingId} IN (
			SELECT meeting_id FROM meeting_classes WHERE class_id = ${classId}
		)`,
	});
	const studentIds = [...new Set(recordRows.map((row) => row.studentId))];
	const studentRows =
		studentIds.length > 0
			? await db.query.students.findMany({
					where: inArray(students.id, studentIds),
				})
			: [];
	const studentNameById = new Map(studentRows.map((row) => [row.id, row.name]));
	for (const record of recordRows) {
		const meeting = record.meetingId
			? meetingById.get(record.meetingId)
			: undefined;
		events.push(
			recordEvent(
				record,
				meeting,
				{ id: classId, name: classRow.name },
				studentNameById.get(record.studentId) ?? null,
			),
		);
	}

	// Relatos gerais das reuniões da turma (spec 0008), internos inclusos.
	const reportRows: ReportRow[] =
		meetingRows.length > 0
			? await db.query.generalReports.findMany({
					where: inArray(
						generalReports.meetingId,
						meetingRows.map((row) => row.id),
					),
				})
			: [];
	for (const report of reportRows) {
		const meeting = meetingById.get(report.meetingId);
		events.push({
			id: `relato:${report.id}`,
			tipo: "relato_geral",
			data: (meeting ? meetingDate(meeting) : report.createdAt).toISOString(),
			studentId: null,
			studentName: null,
			turmaId: classId,
			turmaNome: classRow.name,
			reuniaoId: report.meetingId,
			reuniaoTitulo: meeting?.title ?? null,
			reuniaoStatus: meeting?.status ?? null,
			texto: report.texto,
			categoriaId: report.categoryId,
			componenteId: null,
			includeInMinutes: report.includeInMinutes,
			interno: !report.includeInMinutes,
			metadata: {},
		});
	}

	let filtered = filterEvents(events, query);
	if (query.periodo && query.periodo !== classRow.academicPeriod) {
		// Borda 4: turmas equivalentes de outro período são entidades distintas.
		filtered = [];
	}

	return {
		turma: {
			id: classRow.id,
			name: classRow.name,
			academicPeriod: classRow.academicPeriod,
			course: classRow.course,
			grade: classRow.grade,
			shift: classRow.shift,
		},
		alunos,
		reunioes: meetingRows
			.map((row) => ({
				id: row.id,
				title: row.title,
				status: row.status,
				heldAt: row.heldAt ? row.heldAt.toISOString() : null,
			}))
			.sort((a, b) => (a.heldAt ?? "").localeCompare(b.heldAt ?? "")),
		eventos: sortEvents(filtered),
	};
}
