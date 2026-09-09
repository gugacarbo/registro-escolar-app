import { useQuery } from "@tanstack/react-query";

import type { MinutePreviewJson } from "#/lib/minutes/types";

export function getMinutePreviewQueryKey(meetingId: string) {
	return ["minutes", meetingId, "preview"];
}

export function useMinutePreview(meetingId: string | undefined) {
	return useQuery<MinutePreviewJson>({
		queryKey: getMinutePreviewQueryKey(meetingId ?? ""),
		queryFn: async () => {
			const response = await fetch(`/api/meetings/${meetingId}/minutes`);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar prévia da ata");
			}
			return response.json() as Promise<MinutePreviewJson>;
		},
		enabled: !!meetingId,
		staleTime: 30_000,
	});
}
