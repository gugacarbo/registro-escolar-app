import type { PaginatedResult } from "#/lib/pagination";

import type { Role } from "./schema";

export type ListRolesOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type RolesPageResult = PaginatedResult<Role>;
