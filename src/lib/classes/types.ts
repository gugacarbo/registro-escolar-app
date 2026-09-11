import type { PaginatedResult } from "#/lib/pagination";

import type { Class } from "./schema";

export type ListClassesOptions = {
	limit?: number;
	offset?: number;
	search?: string;
	academicPeriod?: string;
};

export type ClassListItem = Class & {
	activeStudentCount: number;
};

export type ClassesPageResult = PaginatedResult<ClassListItem> & {
	academicPeriods: string[];
};
