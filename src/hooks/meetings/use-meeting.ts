import { useQuery } from "@tanstack/react-query";

import type { Meeting } from "#/lib/meetings/schema";

export function getMeetingQueryKey(id: string) {
	return ["meeting", id];
}

export function useMeeting(id: string) {
	return useQuery<Meeting>({
		queryKey: getMeetingQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/meetings/${id}`);
			if (!response.ok) {
				throw new Error("Falha ao carregar reunião");
			}
			return response.json() as Promise<Meeting>;
		},
		enabled: !!id,
		staleTime: 30_000,
	});
}
