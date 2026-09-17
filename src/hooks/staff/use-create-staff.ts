import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { StaffMember } from "#/lib/staff/schema";

import { getStaffQueryKey } from "./use-staff";

export function useCreateStaff() {
	const queryClient = useQueryClient();

	return useMutation<
		StaffMember,
		Error,
		{
			name: string;
			email?: string;
			phone?: string;
			notes?: string;
			defaultRoleId?: string | null;
		}
	>({
		mutationFn: async (data) => {
			const response = await fetch("/api/staff", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar servidor");
			}
			return response.json() as Promise<StaffMember>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getStaffQueryKey() });
		},
	});
}
