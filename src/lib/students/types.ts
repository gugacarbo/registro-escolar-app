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
