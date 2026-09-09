import { useQuery } from "@tanstack/react-query";

import type { MeetingClassStudentsResult } from "#/lib/meeting-student-status/types";

export function useMeetingClassStudents(meetingId: string, classId: string) {
	return useQuery<MeetingClassStudentsResult>({
		queryKey: ["meetings", meetingId, "classes", classId, "students"],
		queryFn: async () => {
			const response = await fetch(
				`/api/meetings/${meetingId}/classes/${classId}/students`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar alunos da turma");
			}
			return response.json() as Promise<MeetingClassStudentsResult>;
		},
		staleTime: 30_000,
		enabled: classId.length > 0,
	});
}
