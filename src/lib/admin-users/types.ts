import type { PaginatedResult } from "#/lib/pagination";

import type { AdminUser } from "./schema";

export type ListUsersOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type AdminUsersPageResult = PaginatedResult<AdminUser>;
