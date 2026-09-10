import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MeetingStudentRecord } from "#/lib/records/types";

export function getMeetingStudentRecordsQueryKey(
	meetingId: string,
	studentId: string,
) {
	return ["meetings", meetingId, "students", studentId, "records"];
}

export function useMeetingStudentRecords(meetingId: string, studentId: string) {
	return useQuery<{ records: MeetingStudentRecord[] }>({
		queryKey: getMeetingStudentRecordsQueryKey(meetingId, studentId),
		queryFn: async () => {
			const response = await fetch(
				`/api/meetings/${meetingId}/students/${studentId}/records`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(
					body.error ?? "Falha ao carregar registros do estudante",
				);
			}
			return response.json() as Promise<{ records: MeetingStudentRecord[] }>;
		},
		staleTime: 30_000,
		gcTime: 5 * 60_000,
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

async function requestJson(
	input: string,
	init: RequestInit,
	fallbackError: string,
) {
	const response = await fetch(input, init);
	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as {
			error?: string;
		};
		throw new Error(body.error ?? fallbackError);
	}
	return response.json();
}

export function useCreateLinkedRecord(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, CreateLinkedRecordVariables>({
		mutationFn: async (variables) =>
			requestJson(
				`/api/meetings/${meetingId}/students/${variables.studentId}/records`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						texto: variables.texto,
						categoriaId: variables.categoriaId ?? null,
						componenteId: variables.componenteId ?? null,
						origemId: variables.origemId ?? null,
						incluirNaAta: variables.incluirNaAta ?? true,
					}),
				},
				"Falha ao criar registro",
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getMeetingStudentRecordsQueryKey(
					meetingId,
					variables.studentId,
				),
			});
		},
	});
}

export type UpdateLinkedRecordVariables = CreateLinkedRecordVariables & {
	recordId: string;
};

export function useUpdateLinkedRecord(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, UpdateLinkedRecordVariables>({
		mutationFn: async (variables) =>
			requestJson(
				`/api/meetings/${meetingId}/records/${variables.recordId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						texto: variables.texto,
						categoriaId: variables.categoriaId ?? null,
						componenteId: variables.componenteId ?? null,
						origemId: variables.origemId ?? null,
						incluirNaAta: variables.incluirNaAta ?? true,
					}),
				},
				"Falha ao editar registro",
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getMeetingStudentRecordsQueryKey(
					meetingId,
					variables.studentId,
				),
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
		mutationFn: async ({ studentId, record, incluir }) =>
			requestJson(
				`/api/meetings/${meetingId}/students/${studentId}/records/${record.id}/include`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ incluir }),
				},
				"Falha ao atualizar inclusão na ata",
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getMeetingStudentRecordsQueryKey(
					meetingId,
					variables.studentId,
				),
			});
		},
	});
}
