import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { StudentsPageResult } from "#/lib/students/types";

const STUDENTS_QUERY_KEY = ["students"] as const;

export type UseStudentsParams = {
	search?: string;
	page?: number;
	pageSize?: number;
};

export function useStudents({
	search,
	page = 1,
	pageSize = 10,
}: UseStudentsParams = {}) {
	return useQuery<StudentsPageResult>({
		queryKey: [...STUDENTS_QUERY_KEY, { search: search ?? "", page, pageSize }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			const response = await fetch(`/api/students?${params.toString()}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar alunos");
			}
			return response.json() as Promise<StudentsPageResult>;
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export function getStudentsQueryKey() {
	return STUDENTS_QUERY_KEY;
}
