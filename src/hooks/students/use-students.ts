import { useQuery } from "@tanstack/react-query";

import type { Student } from "#/lib/students/schema";

const STUDENTS_QUERY_KEY = ["students"] as const;

export function useStudents() {
	return useQuery<Student[]>({
		queryKey: STUDENTS_QUERY_KEY,
		queryFn: async () => {
			const response = await fetch("/api/students");
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
