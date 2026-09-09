import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Meeting, TransitionAction } from "#/lib/meetings/schema";

import { getMeetingQueryKey } from "./use-meeting";
import { getMeetingsQueryKey } from "./use-meetings";

export type { TransitionAction };

export function useTransitionMeeting(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<Meeting, Error, TransitionAction>({
		mutationFn: async (action) => {
			const response = await fetch(`/api/meetings/${meetingId}/${action}`, {
				method: "PATCH",
			});
			if (!response.ok) {
				// Propaga mensagens PT-BR do servidor (422 sem turmas, 409
				// transição inválida).
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar reunião");
			}
			return response.json() as Promise<Meeting>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMeetingsQueryKey() });
			queryClient.invalidateQueries({
				queryKey: getMeetingQueryKey(meetingId),
			});
		},
	});
}
