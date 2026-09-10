import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { StaffMember } from "#/lib/staff/schema";
import { getStaffQueryKey } from "./use-staff";
import { getStaffMemberQueryKey } from "./use-staff-member";

export function useDeleteStaffMember(id: string) {
	const queryClient = useQueryClient();

	return useMutation<StaffMember, Error, void>({
		mutationFn: async () => {
			const response = await fetch(`/api/staff/${id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao remover servidor");
			}
			return response.json() as Promise<StaffMember>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getStaffQueryKey() });
			queryClient.invalidateQueries({ queryKey: getStaffMemberQueryKey(id) });
		},
	});
}
