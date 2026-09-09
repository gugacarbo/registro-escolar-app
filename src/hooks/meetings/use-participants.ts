import { useQuery } from "@tanstack/react-query";

import type { MeetingParticipant } from "#/lib/meetings/schema";

export function useParticipants(meetingId: string) {
	return useQuery<MeetingParticipant[]>({
		queryKey: ["participants", meetingId],
		queryFn: async () => {
			const response = await fetch(`/api/meetings/${meetingId}/participants`);
			if (!response.ok) {
				throw new Error("Falha ao carregar participantes");
			}
			return response.json() as Promise<MeetingParticipant[]>;
		},
		staleTime: 30_000,
	});
}
