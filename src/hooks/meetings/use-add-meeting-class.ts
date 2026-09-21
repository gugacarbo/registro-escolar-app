import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMinutePreviewQueryKey } from "#/hooks/minutes/use-minute-preview";
import type { MeetingClass } from "./use-meeting-classes";
import { getMeetingClassesQueryKey } from "./use-meeting-classes";

export function useAddMeetingClass(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<MeetingClass, Error, string>({
		mutationFn: async (classId) => {
			const response = await fetch(`/api/meetings/${meetingId}/classes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ classId }),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao vincular turma");
			}
			return response.json() as Promise<MeetingClass>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMeetingClassesQueryKey(meetingId),
			});
			queryClient.invalidateQueries({
				queryKey: getMinutePreviewQueryKey(meetingId),
			});
		},
	});
}
