import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { AdminUsersPageResult } from "#/lib/admin-users/types";

const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;

export type UseAdminUsersParams = {
	search?: string;
	page?: number;
	pageSize?: number;
};

export function useAdminUsers({
	search,
	page = 1,
	pageSize = 10,
}: UseAdminUsersParams = {}) {
	return useQuery<AdminUsersPageResult>({
		queryKey: [
			...ADMIN_USERS_QUERY_KEY,
			{ search: search ?? "", page, pageSize },
		],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/admin/users?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar usuários");
			}
			return response.json() as Promise<AdminUsersPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function getAdminUsersQueryKey() {
	return ADMIN_USERS_QUERY_KEY;
}
