import { useQuery } from "@tanstack/react-query";

import type { Class } from "#/lib/classes/schema";

export type MeetingClass = {
	id: string;
	meetingId: string;
	classId: string;
	createdAt: string;
	updatedAt: string;
	class?: Class;
};

export function getMeetingClassesQueryKey(meetingId: string) {
	return ["meetings", meetingId, "classes"];
}

export function useMeetingClasses(meetingId: string) {
	return useQuery<MeetingClass[]>({
		queryKey: getMeetingClassesQueryKey(meetingId),
		queryFn: async () => {
			const response = await fetch(`/api/meetings/${meetingId}/classes`);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar turmas da reunião");
			}
			return response.json() as Promise<MeetingClass[]>;
		},
		enabled: meetingId.length > 0,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
