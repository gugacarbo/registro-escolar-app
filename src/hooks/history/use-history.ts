import { useQuery } from "@tanstack/react-query";

import type {
	ClassHistoryResult,
	StudentHistoryResult,
} from "#/lib/history/types";

/** Filtros compartilhados de /history (specs 0011/0012). */
export type HistoryFilters = {
	turmaId?: string;
	periodo?: string;
	reuniaoId?: string;
	categoriaId?: string;
	componenteId?: string;
	alunoId?: string;
	q?: string;
};

function buildUrl(base: string, filters: HistoryFilters): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value) {
			params.set(key, value);
		}
	}
	const qs = params.toString();
	return qs ? `${base}?${qs}` : base;
}

/**
 * Linha do tempo do aluno (spec 0011). Acessível inclusive durante a reunião
 * (borda 3), sem invalidação automática — histórico é read-only.
 */
export function useStudentHistory(
	studentId: string,
	filters: HistoryFilters = {},
) {
	return useQuery<StudentHistoryResult>({
		queryKey: ["students", studentId, "history", filters],
		queryFn: async () => {
			const response = await fetch(
				buildUrl(`/api/students/${studentId}/history`, filters),
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar histórico do aluno");
			}
			return response.json() as Promise<StudentHistoryResult>;
		},
		enabled: studentId.length > 0,
		staleTime: 60_000,
	});
}

/** Histórico da turma (spec 0012): dados cadastrais, alunos, reuniões e eventos. */
export function useClassHistory(classId: string, filters: HistoryFilters = {}) {
	return useQuery<ClassHistoryResult>({
		queryKey: ["classes", classId, "history", filters],
		queryFn: async () => {
			const response = await fetch(
				buildUrl(`/api/classes/${classId}/history`, filters),
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar histórico da turma");
			}
			return response.json() as Promise<ClassHistoryResult>;
		},
		enabled: classId.length > 0,
		staleTime: 60_000,
	});
}
