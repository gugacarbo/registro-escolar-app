import { useQuery } from "@tanstack/react-query";

import type { Component } from "#/lib/components/schema";

export function getComponentQueryKey(id: string) {
	return ["components", id];
}

export function useComponent(id: string) {
	return useQuery<Component>({
		queryKey: getComponentQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/components/${id}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar componente");
			}
			return response.json() as Promise<Component>;
		},
		enabled: !!id,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
