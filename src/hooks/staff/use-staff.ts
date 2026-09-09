import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { StaffPageResult } from "#/lib/staff/types";

const STAFF_QUERY_KEY = ["staff"] as const;

export type UseStaffParams = {
	search?: string;
	page?: number;
	pageSize?: number;
};

export function useStaff({
	search,
	page = 1,
	pageSize = 10,
}: UseStaffParams = {}) {
	return useQuery<StaffPageResult>({
		queryKey: [...STAFF_QUERY_KEY, { search: search ?? "", page, pageSize }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/staff?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar servidores");
			}
			return response.json() as Promise<StaffPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
	});
}

export function getStaffQueryKey() {
	return STAFF_QUERY_KEY;
}
