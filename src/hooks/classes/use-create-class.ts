import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Class } from "#/lib/classes/schema";

import { getClassesQueryKey } from "./use-classes";

export type CreateClassValues = {
	nome: string;
	periodoLetivo: string;
	curso?: string;
	serie?: string;
	turno?: string;
};

export function useCreateClass() {
	const queryClient = useQueryClient();

	return useMutation<Class, Error, CreateClassValues>({
		mutationFn: async (data) => {
			const response = await fetch("/api/classes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar turma");
			}
			return response.json() as Promise<Class>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getClassesQueryKey() });
		},
	});
}
