import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ComponentsPageResult } from "#/lib/components/types";

const COMPONENTS_QUERY_KEY = ["components"] as const;

export type UseComponentsParams = {
	search?: string;
	page?: number;
	pageSize?: number;
};

export function useComponents({
	search,
	page = 1,
	pageSize = 10,
}: UseComponentsParams = {}) {
	return useQuery<ComponentsPageResult>({
		queryKey: [
			...COMPONENTS_QUERY_KEY,
			{ search: search ?? "", page, pageSize },
		],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/components?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar componentes");
			}
			return response.json() as Promise<ComponentsPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function getComponentsQueryKey() {
	return COMPONENTS_QUERY_KEY;
}
