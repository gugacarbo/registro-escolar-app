import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Component } from "#/lib/components/schema";
import { getComponentQueryKey } from "./use-component";
import { getComponentsQueryKey } from "./use-components";

export type UpdateComponentValues = {
	name?: string;
};

export function useUpdateComponent(id: string) {
	const queryClient = useQueryClient();

	return useMutation<Component, Error, UpdateComponentValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/components/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar componente");
			}
			return response.json() as Promise<Component>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getComponentsQueryKey() });
			queryClient.invalidateQueries({ queryKey: getComponentQueryKey(id) });
		},
	});
}
