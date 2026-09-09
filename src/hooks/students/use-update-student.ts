import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Student } from "#/lib/students/schema";

import { getStudentQueryKey } from "./use-student";
import { getStudentsQueryKey } from "./use-students";

export type UpdateStudentValues = {
	name?: string;
	document?: string | null;
	registrationNumber?: string | null;
	email?: string | null;
	phone?: string | null;
	birthDate?: string | null;
	notes?: string | null;
};

export function useUpdateStudent(id: string) {
	const queryClient = useQueryClient();

	return useMutation<Student, Error, UpdateStudentValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/students/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar estudante");
			}
			return response.json() as Promise<Student>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getStudentsQueryKey() });
			queryClient.invalidateQueries({ queryKey: getStudentQueryKey(id) });
		},
	});
}
