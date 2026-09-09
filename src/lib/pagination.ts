export type PaginatedResult<TData> = {
	data: TData[];
	total: number;
	page: number;
	pageSize: number;
};

export type PageParams = {
	page: number;
	pageSize: number;
	limit: number;
	offset: number;
	search?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_LEGACY_LIMIT = 200;

function toPositiveInt(value: number): number | undefined {
	if (!Number.isFinite(value)) {
		return undefined;
	}
	const floored = Math.floor(value);
	return floored >= 1 ? floored : undefined;
}

export function parsePageParams(searchParams: URLSearchParams): PageParams {
	const rawSearch = searchParams.get("search")?.trim();
	const search = rawSearch ? rawSearch : undefined;

	const hasPageParams =
		searchParams.has("page") || searchParams.has("pageSize");
	if (hasPageParams) {
		const page = toPositiveInt(Number(searchParams.get("page"))) ?? 1;
		const pageSize = Math.min(
			toPositiveInt(Number(searchParams.get("pageSize"))) ?? DEFAULT_PAGE_SIZE,
			MAX_PAGE_SIZE,
		);
		return {
			page,
			pageSize,
			limit: pageSize,
			offset: (page - 1) * pageSize,
			search,
		};
	}

	const limit = Math.min(
		toPositiveInt(Number(searchParams.get("limit"))) ?? DEFAULT_PAGE_SIZE,
		MAX_LEGACY_LIMIT,
	);
	const rawOffset = Number(searchParams.get("offset"));
	const offset =
		Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
	return {
		page: Math.floor(offset / limit) + 1,
		pageSize: limit,
		limit,
		offset,
		search,
	};
}
