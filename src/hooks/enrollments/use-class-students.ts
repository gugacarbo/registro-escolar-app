import { useQuery } from "@tanstack/react-query";

import type { Student } from "#/lib/students/schema";

export type ClassStudentRow = {
	student: Student;
	enrollment: {
		id: string;
		startDate: string;
		endDate: string | null;
		status: string;
	};
};

export function useClassStudents(classId: string, date: string) {
	return useQuery<ClassStudentRow[]>({
		queryKey: ["classes", classId, "students", date],
		queryFn: async () => {
			const params = new URLSearchParams({ date });
			const response = await fetch(
				`/api/classes/${classId}/students?${params.toString()}`,
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar estudantes da turma");
			}
			return response.json() as Promise<ClassStudentRow[]>;
		},
		enabled: classId.length > 0 && date.length > 0,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
