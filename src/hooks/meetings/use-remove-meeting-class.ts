import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMinutePreviewQueryKey } from "#/hooks/minutes/use-minute-preview";
import { getMeetingClassesQueryKey } from "./use-meeting-classes";

export function useRemoveMeetingClass(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: async (classId) => {
			const response = await fetch(
				`/api/meetings/${meetingId}/classes/${classId}`,
				{ method: "DELETE" },
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao desvincular turma");
			}
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
