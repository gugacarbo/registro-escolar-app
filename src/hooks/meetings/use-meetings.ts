import { useQuery } from "@tanstack/react-query";

import type { Meeting, MeetingStatus } from "#/lib/meetings/schema";

const MEETINGS_QUERY_KEY = ["meetings"] as const;

export function getMeetingsQueryKey(search?: string, status?: MeetingStatus) {
	if (search === undefined && status === undefined) {
		// Prefixo comum: invalida todas as variações filtradas da lista.
		return MEETINGS_QUERY_KEY;
	}
	return [...MEETINGS_QUERY_KEY, search ?? "", status ?? ""];
}

export function useMeetings({
	search,
	status,
}: {
	search?: string;
	status?: MeetingStatus;
} = {}) {
	return useQuery<Meeting[]>({
		queryKey: getMeetingsQueryKey(search, status),
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) {
				params.set("search", search);
			}
			if (status) {
				params.set("status", status);
			}
			const query = params.toString();
			const response = await fetch(
				query ? `/api/meetings?${query}` : "/api/meetings",
			);
			if (!response.ok) {
				throw new Error("Falha ao carregar reuniões");
			}
			return response.json() as Promise<Meeting[]>;
		},
		staleTime: 30_000,
	});
}
