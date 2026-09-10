import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GeneralReportRowJson } from "#/lib/general-reports/types";

export function getGeneralReportsQueryKey(meetingId: string) {
	return ["meetings", meetingId, "general-reports"];
}

export function useGeneralReports(meetingId: string) {
	return useQuery<GeneralReportRowJson[]>({
		queryKey: getGeneralReportsQueryKey(meetingId),
		queryFn: async () => {
			const response = await fetch(
				`/api/meetings/${meetingId}/general-reports`,
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar relatos gerais");
			}
			return response.json() as Promise<GeneralReportRowJson[]>;
		},
		enabled: meetingId.length > 0,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

export type GeneralReportValues = {
	texto: string;
	categoriaId?: string | null;
	origemId?: string | null;
	incluirNaAta?: boolean;
};

async function requestJson(input: string, init: RequestInit, error: string) {
	const response = await fetch(input, init);
	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as {
			error?: string;
		};
		throw new Error(body.error ?? error);
	}
	return response.json();
}

export function useCreateGeneralReport(meetingId: string) {
	const queryClient = useQueryClient();
	return useMutation<unknown, Error, GeneralReportValues>({
		mutationFn: async (values) =>
			requestJson(
				`/api/meetings/${meetingId}/general-reports`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						texto: values.texto,
						categoriaId: values.categoriaId ?? null,
						origemId: values.origemId ?? null,
						incluirNaAta: values.incluirNaAta ?? true,
					}),
				},
				"Falha ao criar relato geral",
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getGeneralReportsQueryKey(meetingId),
			});
		},
	});
}

export function useUpdateGeneralReport(meetingId: string) {
	const queryClient = useQueryClient();
	return useMutation<
		unknown,
		Error,
		GeneralReportValues & { reportId: string }
	>({
		mutationFn: async (values) =>
			requestJson(
				`/api/meetings/${meetingId}/general-reports/${values.reportId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						texto: values.texto,
						categoriaId: values.categoriaId ?? null,
						origemId: values.origemId ?? null,
						incluirNaAta: values.incluirNaAta ?? true,
					}),
				},
				"Falha ao editar relato geral",
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getGeneralReportsQueryKey(meetingId),
			});
		},
	});
}
