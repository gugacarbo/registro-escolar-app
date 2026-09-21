import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Role } from "#/lib/roles/schema";
import { getRoleQueryKey } from "./use-role";
import { getRolesQueryKey } from "./use-roles";

export type UpdateRoleValues = {
	name?: string;
};

export function useUpdateRole(id: string) {
	const queryClient = useQueryClient();

	return useMutation<Role, Error, UpdateRoleValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/roles/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar cargo");
			}
			return response.json() as Promise<Role>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getRolesQueryKey() });
			queryClient.invalidateQueries({ queryKey: getRoleQueryKey(id) });
		},
	});
}
