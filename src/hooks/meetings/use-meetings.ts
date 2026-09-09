import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { MeetingStatus } from "#/lib/meetings/schema";
import type { MeetingsPageResult } from "#/lib/meetings/types";

const MEETINGS_QUERY_KEY = ["meetings"] as const;

export type UseMeetingsParams = {
	search?: string;
	status?: MeetingStatus;
	page?: number;
	pageSize?: number;
};

export function getMeetingsQueryKey(
	search?: string,
	status?: MeetingStatus,
	page?: number,
	pageSize?: number,
) {
	if (
		search === undefined &&
		status === undefined &&
		page === undefined &&
		pageSize === undefined
	) {
		// Prefixo comum: invalida todas as variações filtradas da lista.
		return MEETINGS_QUERY_KEY;
	}
	return [
		...MEETINGS_QUERY_KEY,
		{
			search: search ?? "",
			status: status ?? "",
			page: page ?? 1,
			pageSize: pageSize ?? 10,
		},
	];
}

export function useMeetings({
	search,
	status,
	page = 1,
	pageSize = 10,
}: UseMeetingsParams = {}) {
	return useQuery<MeetingsPageResult>({
		queryKey: getMeetingsQueryKey(search, status, page, pageSize),
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			if (status) {
				params.set("status", status);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/meetings?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar reuniões");
			}
			return response.json() as Promise<MeetingsPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
	});
}
