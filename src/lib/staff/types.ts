import type { PaginatedResult } from "#/lib/pagination";

import type { StaffMember } from "./schema";

export type ListStaffOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type StaffPageResult = PaginatedResult<StaffMember>;
