import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { StaffMember } from "#/lib/staff/schema";

import { getStaffQueryKey } from "./use-staff";
import { getStaffMemberQueryKey } from "./use-staff-member";

export type UpdateStaffMemberValues = {
	name?: string;
	email?: string | null;
	phone?: string | null;
	notes?: string | null;
	defaultRoleId?: string | null;
};

export function useUpdateStaffMember(id: string) {
	const queryClient = useQueryClient();

	return useMutation<StaffMember, Error, UpdateStaffMemberValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/staff/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar servidor");
			}
			return response.json() as Promise<StaffMember>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getStaffQueryKey() });
			queryClient.invalidateQueries({ queryKey: getStaffMemberQueryKey(id) });
		},
	});
}
