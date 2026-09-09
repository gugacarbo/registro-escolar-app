import type { PaginatedResult } from "#/lib/pagination";

import type { Class } from "./schema";

export type ListClassesOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type ClassesPageResult = PaginatedResult<Class>;
