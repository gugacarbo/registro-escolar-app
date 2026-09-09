import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { GenerateMinuteJson } from "#/lib/minutes/types";

import { getMinutePreviewQueryKey } from "./use-minute-preview";
import { getMinuteVersionsQueryKey } from "./use-minute-versions";

export type GenerateMinuteValues = {
	observacao?: string;
};

export function useGenerateMinute(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<GenerateMinuteJson, Error, GenerateMinuteValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/meetings/${meetingId}/minutes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao gerar ata");
			}
			return response.json() as Promise<GenerateMinuteJson>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMinutePreviewQueryKey(meetingId),
			});
			queryClient.invalidateQueries({
				queryKey: getMinuteVersionsQueryKey(meetingId),
			});
		},
	});
}
