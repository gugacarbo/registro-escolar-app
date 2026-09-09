import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Role } from "#/lib/roles/schema";

import { getRolesQueryKey } from "./use-roles";

export function useCreateRole() {
	const queryClient = useQueryClient();

	return useMutation<Role, Error, { name: string }>({
		mutationFn: async (data) => {
			const response = await fetch("/api/roles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar papel");
			}
			return response.json() as Promise<Role>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getRolesQueryKey() });
		},
	});
}
