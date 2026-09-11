import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { StudentRecordRowJson } from "#/lib/records/types";

export type CreateIndependentRecordVariables = {
	studentId: string;
	texto: string;
	turmaId?: string | null;
	categoriaId?: string | null;
	componenteId?: string | null;
	incluirNaAta?: boolean;
};

// POST /api/students/:id/records — registro independente (spec 0007).
export function useCreateIndependentRecord() {
	const queryClient = useQueryClient();

	return useMutation<
		StudentRecordRowJson,
		Error,
		CreateIndependentRecordVariables
	>({
		mutationFn: async (variables) => {
			const response = await fetch(
				`/api/students/${variables.studentId}/records`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						texto: variables.texto,
						turmaId: variables.turmaId ?? null,
						categoriaId: variables.categoriaId ?? null,
						componenteId: variables.componenteId ?? null,
						incluirNaAta: variables.incluirNaAta ?? true,
					}),
				},
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar registro");
			}
			return response.json() as Promise<StudentRecordRowJson>;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["students", variables.studentId, "history"],
			});
		},
	});
}
