import { useQuery } from "@tanstack/react-query";

import type { Student } from "#/lib/students/schema";

export function getStudentQueryKey(id: string) {
	return ["students", id];
}

export function useStudent(id: string) {
	return useQuery<Student>({
		queryKey: getStudentQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/students/${id}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar estudante");
			}
			return response.json() as Promise<Student>;
		},
		enabled: !!id,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
