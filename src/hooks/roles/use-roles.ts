import { useQuery } from "@tanstack/react-query";

import type { Role } from "#/lib/roles/schema";

const ROLES_QUERY_KEY = ["roles"] as const;

export function useRoles(search?: string) {
	return useQuery<Role[]>({
		queryKey: [...ROLES_QUERY_KEY, search ?? ""],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			const query = params.toString();
			const response = await fetch(
				query ? `/api/roles?${query}` : "/api/roles",
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar papéis");
			}
			return response.json() as Promise<Role[]>;
		},
		staleTime: 30_000,
	});
}

export function getRolesQueryKey() {
	return ROLES_QUERY_KEY;
}
