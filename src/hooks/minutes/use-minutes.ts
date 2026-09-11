import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { MinuteApprovalStatus, MinuteListItem } from "#/lib/minutes/types";
import type { PaginatedResult } from "#/lib/pagination";

const MINUTES_QUERY_KEY = ["minutes"] as const;

export type UseMinutesParams = {
	search?: string;
	approvalStatus?: MinuteApprovalStatus;
	page?: number;
	pageSize?: number;
};

export type MinutesPageResult = PaginatedResult<MinuteListItem>;

export function getMinutesQueryKey(
	search?: string,
	approvalStatus?: MinuteApprovalStatus,
	page?: number,
	pageSize?: number,
) {
	if (
		search === undefined &&
		approvalStatus === undefined &&
		page === undefined &&
		pageSize === undefined
	) {
		return MINUTES_QUERY_KEY;
	}
	return [
		...MINUTES_QUERY_KEY,
		{
			search: search ?? "",
			approvalStatus: approvalStatus ?? "",
			page: page ?? 1,
			pageSize: pageSize ?? 10,
		},
	];
}

export function useMinutes({
	search,
	approvalStatus,
	page = 1,
	pageSize = 10,
}: UseMinutesParams = {}) {
	return useQuery<MinutesPageResult>({
		queryKey: getMinutesQueryKey(search, approvalStatus, page, pageSize),
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			if (approvalStatus) {
				params.set("approvalStatus", approvalStatus);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/minutes?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar atas");
			}
			return response.json() as Promise<MinutesPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
	});
}
