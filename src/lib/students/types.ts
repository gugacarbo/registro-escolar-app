import type { PaginatedResult } from "#/lib/pagination";

import type { Student } from "./schema";

export type ListStudentsOptions = {
	limit?: number;
	offset?: number;
	search?: string;
	classId?: string;
};

export type StudentTurma = { id: string; name: string };

export type StudentWithTurmas = Student & { turmas: StudentTurma[] };

export type StudentsPageResult = PaginatedResult<StudentWithTurmas>;

/** Vínculo (matrícula) do estudante em uma turma, com período e status. */
export type StudentMatricula = {
	/** ID da turma. */
	id: string;
	/** Nome da turma. */
	name: string;
	startDate: string;
	endDate: string | null;
	status: string;
};

/** Estudante do detalhe (`GET /api/students/:id`) com os vínculos. */
export type StudentDetail = Student & { matriculas: StudentMatricula[] };
