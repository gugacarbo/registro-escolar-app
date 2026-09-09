import { dateStringToTimestamp, isDateString } from "./dates";

type ClassRowInput = {
	name: unknown;
	academicPeriod: unknown;
	course?: unknown;
	grade?: unknown;
	shift?: unknown;
};

export function mapClassRequestToRow(body: Record<string, unknown>) {
	const row: ClassRowInput = {
		name: body.nome,
		academicPeriod: body.periodoLetivo,
	};
	if (body.curso !== undefined) {
		row.course = body.curso;
	}
	if (body.serie !== undefined) {
		row.grade = body.serie;
	}
	if (body.turno !== undefined) {
		row.shift = body.turno;
	}
	return row;
}

type EnrollmentRowInput = {
	studentId: unknown;
	classId: unknown;
	startDate: unknown;
	endDate?: unknown;
	status?: unknown;
};

export function mapEnrollmentRequestToRow(body: Record<string, unknown>) {
	const row: EnrollmentRowInput = {
		studentId: body.alunoId,
		classId: body.turmaId,
		startDate:
			typeof body.dataInicio === "string" && isDateString(body.dataInicio)
				? new Date(dateStringToTimestamp(body.dataInicio))
				: body.dataInicio,
	};
	if (body.dataTermino !== undefined && body.dataTermino !== null) {
		row.endDate =
			typeof body.dataTermino === "string" && isDateString(body.dataTermino)
				? new Date(dateStringToTimestamp(body.dataTermino))
				: body.dataTermino;
	}
	if (body.status !== undefined) {
		row.status = body.status;
	}
	return row;
}
