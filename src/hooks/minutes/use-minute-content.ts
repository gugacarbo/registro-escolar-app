import { useQuery } from "@tanstack/react-query";

import type { MinuteEditableContentJson } from "#/lib/minutes/types";

export function getMinuteContentQueryKey(meetingId: string) {
	return ["minutes", meetingId, "content"];
}

export function useMinuteContent(meetingId: string | undefined) {
	return useQuery<MinuteEditableContentJson>({
		queryKey: getMinuteContentQueryKey(meetingId ?? ""),
		queryFn: async () => {
			const response = await fetch(
				`/api/meetings/${meetingId}/minutes/content`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar conteúdo da ata");
			}
			return response.json() as Promise<MinuteEditableContentJson>;
		},
		enabled: !!meetingId,
		staleTime: 30_000,
	});
}
