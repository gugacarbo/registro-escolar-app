import { useQuery } from "@tanstack/react-query";

import type { StaffMember } from "#/lib/staff/schema";

const STAFF_QUERY_KEY = ["staff"] as const;

export function useStaff(search?: string) {
	return useQuery<StaffMember[]>({
		queryKey: [...STAFF_QUERY_KEY, search ?? ""],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			const query = params.toString();
			const response = await fetch(
				query ? `/api/staff?${query}` : "/api/staff",
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar servidores");
			}
			return response.json() as Promise<StaffMember[]>;
		},
		staleTime: 30_000,
	});
}

export function getStaffQueryKey() {
	return STAFF_QUERY_KEY;
}
