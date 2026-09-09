import type { PaginatedResult } from "#/lib/pagination";

import type { Component } from "./schema";

export type ListComponentsOptions = {
	limit?: number;
	offset?: number;
	search?: string;
};

export type ComponentsPageResult = PaginatedResult<Component>;
