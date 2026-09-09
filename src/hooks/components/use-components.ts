import { useQuery } from "@tanstack/react-query";

import type { Component } from "#/lib/components/schema";

const COMPONENTS_QUERY_KEY = ["components"] as const;

export function useComponents(search?: string) {
	return useQuery<Component[]>({
		queryKey: [...COMPONENTS_QUERY_KEY, search ?? ""],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			const query = params.toString();
			const response = await fetch(
				query ? `/api/components?${query}` : "/api/components",
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar componentes");
			}
			return response.json() as Promise<Component[]>;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function getComponentsQueryKey() {
	return COMPONENTS_QUERY_KEY;
}
