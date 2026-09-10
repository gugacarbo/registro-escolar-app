import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
	MeetingStudentStatus,
	TrackingStatus,
} from "#/lib/meeting-student-status/schema";

export function useUpdateStudentStatus(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<
		MeetingStudentStatus,
		Error,
		{ studentId: string; status: TrackingStatus; classId: string }
	>({
		mutationFn: async ({ studentId, status, classId }) => {
			const response = await fetch(
				`/api/meetings/${meetingId}/students/${studentId}/status`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status, classId }),
				},
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar status do estudante");
			}
			return response.json() as Promise<MeetingStudentStatus>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["meetings", meetingId],
			});
		},
	});
}
