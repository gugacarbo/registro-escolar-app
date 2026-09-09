import { useQuery } from "@tanstack/react-query";

import type { Class } from "#/lib/classes/schema";

const CLASSES_QUERY_KEY = ["classes"] as const;

export function useClasses(search?: string) {
	return useQuery<Class[]>({
		queryKey: [...CLASSES_QUERY_KEY, search ?? ""],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			const query = params.toString();
			const response = await fetch(
				query ? `/api/classes?${query}` : "/api/classes",
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar turmas");
			}
			return response.json() as Promise<Class[]>;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function getClassesQueryKey() {
	return CLASSES_QUERY_KEY;
}
