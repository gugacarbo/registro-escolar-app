import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MeetingStudentRecord } from "#/lib/records/types";

export function useMeetingStudentRecords(meetingId: string, studentId: string) {
	return useQuery<{ records: MeetingStudentRecord[] }>({
		queryKey: ["meetings", meetingId, "students", studentId, "records"],
		queryFn: async () => {
			const response = await fetch(
				`/api/meetings/${meetingId}/students/${studentId}/records`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar registros do aluno");
			}
			return response.json() as Promise<{ records: MeetingStudentRecord[] }>;
		},
		staleTime: 30_000,
		enabled: studentId.length > 0,
	});
}

export type CreateLinkedRecordVariables = {
	studentId: string;
	texto: string;
	categoriaId?: string | null;
	componenteId?: string | null;
	origemId?: string | null;
	incluirNaAta?: boolean;
};

export function useCreateLinkedRecord(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, CreateLinkedRecordVariables>({
		mutationFn: async ({
			studentId,
			texto,
			categoriaId,
			componenteId,
			origemId,
			incluirNaAta,
		}) => {
			const response = await fetch(
				`/api/meetings/${meetingId}/students/${studentId}/records`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						texto,
						categoriaId,
						componenteId,
						origemId,
						incluirNaAta,
					}),
				},
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar registro");
			}
			return response.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: [
					"meetings",
					meetingId,
					"students",
					variables.studentId,
					"records",
				],
			});
		},
	});
}

export function useSetRecordInclusion(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<
		unknown,
		Error,
		{ studentId: string; record: MeetingStudentRecord; incluir: boolean }
	>({
		mutationFn: async ({ studentId, record, incluir }) => {
			const response = await fetch(
				`/api/meetings/${meetingId}/students/${studentId}/records/${record.id}/include`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ incluir }),
				},
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar inclusão na ata");
			}
			return response.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: [
					"meetings",
					meetingId,
					"students",
					variables.studentId,
					"records",
				],
			});
		},
	});
}
