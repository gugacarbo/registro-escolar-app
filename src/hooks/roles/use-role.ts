import { useQuery } from "@tanstack/react-query";

import type { Role } from "#/lib/roles/schema";

export function getRoleQueryKey(id: string) {
	return ["roles", id];
}

export function useRole(id: string) {
	return useQuery<Role>({
		queryKey: getRoleQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/roles/${id}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar cargo");
			}
			return response.json() as Promise<Role>;
		},
		enabled: !!id,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
