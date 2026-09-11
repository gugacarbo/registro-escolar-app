import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AdminUser, UserRole } from "#/lib/admin-users/schema";

import { getAdminUsersQueryKey } from "./use-admin-users";

export function useUpdateUserRole(id: string) {
	const queryClient = useQueryClient();

	return useMutation<AdminUser, Error, { role: UserRole }>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/admin/users/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar o papel");
			}
			return response.json() as Promise<AdminUser>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getAdminUsersQueryKey() });
		},
	});
}
