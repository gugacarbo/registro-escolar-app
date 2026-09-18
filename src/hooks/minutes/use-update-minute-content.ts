import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateMinuteContentInput } from "#/lib/minutes/schema";
import type { MinuteEditableContentJson } from "#/lib/minutes/types";

import { getMinuteContentQueryKey } from "./use-minute-content";
import { getMinutePreviewQueryKey } from "./use-minute-preview";

export function useUpdateMinuteContent(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<
		MinuteEditableContentJson,
		Error,
		UpdateMinuteContentInput
	>({
		mutationFn: async (data) => {
			const response = await fetch(
				`/api/meetings/${meetingId}/minutes/content`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao salvar conteúdo da ata");
			}
			return response.json() as Promise<MinuteEditableContentJson>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMinuteContentQueryKey(meetingId),
			});
			queryClient.invalidateQueries({
				queryKey: getMinutePreviewQueryKey(meetingId),
			});
			queryClient.invalidateQueries({ queryKey: ["minutes"] });
		},
	});
}
