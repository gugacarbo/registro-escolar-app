import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Component } from "#/lib/components/schema";

import { getComponentsQueryKey } from "./use-components";

export type CreateComponentValues = {
	name: string;
};

export function useCreateComponent() {
	const queryClient = useQueryClient();

	return useMutation<Component, Error, CreateComponentValues>({
		mutationFn: async (data) => {
			const response = await fetch("/api/components", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar componente");
			}
			return response.json() as Promise<Component>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getComponentsQueryKey() });
		},
	});
}
