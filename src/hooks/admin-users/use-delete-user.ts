import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AdminUser } from "#/lib/admin-users/schema";

import { getAdminUsersQueryKey } from "./use-admin-users";

export function useDeleteUser(id: string) {
	const queryClient = useQueryClient();

	return useMutation<AdminUser, Error, void>({
		mutationFn: async () => {
			const response = await fetch(`/api/admin/users/${id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao excluir o usuário");
			}
			return response.json() as Promise<AdminUser>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getAdminUsersQueryKey() });
		},
	});
}
