import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Student } from "#/lib/students/schema";

import { getStudentsQueryKey } from "./use-students";

export function useCreateStudent() {
	const queryClient = useQueryClient();

	return useMutation<
		Student,
		Error,
		{
			name: string;
			document?: string;
			registrationNumber?: string;
			email?: string;
			phone?: string;
			birthDate?: string;
			notes?: string;
		}
	>({
		mutationFn: async (data) => {
			const response = await fetch("/api/students", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar aluno");
			}
			return response.json() as Promise<Student>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getStudentsQueryKey() });
		},
	});
}
