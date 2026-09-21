import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Meeting } from "#/lib/meetings/schema";

import { getMeetingQueryKey } from "./use-meeting";
import { getMeetingsQueryKey } from "./use-meetings";

export type UpdateMeetingValues = {
	title?: string;
	heldAt?: string;
	templateId?: string | null;
};

export function useUpdateMeeting(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<Meeting, Error, UpdateMeetingValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/meetings/${meetingId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
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
