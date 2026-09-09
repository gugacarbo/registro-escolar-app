import type { PaginatedResult } from "#/lib/pagination";

import type { Student } from "./schema";

export type ListStudentsOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type StudentsPageResult = PaginatedResult<Student>;
