import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { MeetingParticipant } from "#/lib/meetings/schema";

export function useAddParticipant(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<
		MeetingParticipant,
		Error,
		{ staffId: string; roleId: string }
	>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/meetings/${meetingId}/participants`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao adicionar participante");
			}
			return response.json() as Promise<MeetingParticipant>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["participants", meetingId],
			});
		},
	});
}
