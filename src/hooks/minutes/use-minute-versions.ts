import { useQuery } from "@tanstack/react-query";

import type { MinuteVersionJson } from "#/lib/minutes/types";

export function getMinuteVersionsQueryKey(meetingId: string) {
	return ["minutes", meetingId, "versions"];
}

export function useMinuteVersions(meetingId: string | undefined) {
	return useQuery<MinuteVersionJson[]>({
		queryKey: getMinuteVersionsQueryKey(meetingId ?? ""),
		queryFn: async () => {
			const response = await fetch(
				`/api/meetings/${meetingId}/minutes/versions`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar versões da ata");
			}
			return response.json() as Promise<MinuteVersionJson[]>;
		},
		enabled: !!meetingId,
		staleTime: 30_000,
	});
}
