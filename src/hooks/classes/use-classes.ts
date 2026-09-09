import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ClassesPageResult } from "#/lib/classes/types";

const CLASSES_QUERY_KEY = ["classes"] as const;

export type UseClassesParams = {
	search?: string;
	page?: number;
	pageSize?: number;
};

export function useClasses({
	search,
	page = 1,
	pageSize = 10,
}: UseClassesParams = {}) {
	return useQuery<ClassesPageResult>({
		queryKey: [...CLASSES_QUERY_KEY, { search: search ?? "", page, pageSize }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/classes?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar turmas");
			}
			return response.json() as Promise<ClassesPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function getClassesQueryKey() {
	return CLASSES_QUERY_KEY;
}
