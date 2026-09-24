import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Class } from "#/lib/classes/schema";

import { getClassesQueryKey } from "./use-classes";

export type UpdateClassValues = {
	nome?: string;
	periodoLetivo?: string;
	curso?: string;
	serie?: string;
	turno?: string;
};

export function useUpdateClass(id: string) {
	const queryClient = useQueryClient();

	return useMutation<Class, Error, UpdateClassValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/classes/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar turma");
			}
			return response.json() as Promise<Class>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getClassesQueryKey() });
			queryClient.invalidateQueries({ queryKey: ["classes", id] });
			queryClient.invalidateQueries({ queryKey: ["classes", id, "history"] });
		},
	});
}
