import { useQuery } from "@tanstack/react-query";

import type { Student } from "#/lib/students/schema";

const STUDENTS_QUERY_KEY = ["students"] as const;

export function useStudents(search?: string) {
	return useQuery<Student[]>({
		queryKey: [...STUDENTS_QUERY_KEY, search ?? ""],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			const query = params.toString();
			const response = await fetch(
				query ? `/api/students?${query}` : "/api/students",
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar alunos");
			}
			return response.json() as Promise<Student[]>;
		},
		staleTime: 30_000,
	});
}

export function getStudentsQueryKey() {
	return STUDENTS_QUERY_KEY;
}
