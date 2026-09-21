import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { RolesPageResult } from "#/lib/roles/types";

const ROLES_QUERY_KEY = ["roles"] as const;

export type UseRolesParams = {
	search?: string;
	page?: number;
	pageSize?: number;
};

export function useRoles({
	search,
	page = 1,
	pageSize = 10,
}: UseRolesParams = {}) {
	return useQuery<RolesPageResult>({
		queryKey: [...ROLES_QUERY_KEY, { search: search ?? "", page, pageSize }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/roles?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar cargos");
			}
			return response.json() as Promise<RolesPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
	});
}

export function getRolesQueryKey() {
	return ROLES_QUERY_KEY;
}
