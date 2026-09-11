import { useQuery } from "@tanstack/react-query";

import type { StudentDetail } from "#/lib/students/types";

export function getStudentQueryKey(id: string) {
	return ["students", id];
}

export function useStudent(id: string) {
	return useQuery<StudentDetail>({
		queryKey: getStudentQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/students/${id}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar estudante");
			}
			return response.json() as Promise<StudentDetail>;
		},
		enabled: !!id,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
