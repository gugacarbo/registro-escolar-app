import { useQuery } from "@tanstack/react-query";

import type { StaffMember } from "#/lib/staff/schema";

export function getStaffMemberQueryKey(id: string) {
	return ["staff", id];
}

export function useStaffMember(id: string) {
	return useQuery<StaffMember>({
		queryKey: getStaffMemberQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/staff/${id}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar servidor");
			}
			return response.json() as Promise<StaffMember>;
		},
		enabled: !!id,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
