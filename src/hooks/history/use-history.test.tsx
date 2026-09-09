import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useClassHistory, useStudentHistory } from "./use-history";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useStudentHistory (spec 0011)", () => {
	it("monta URL com filtros e retorna a linha do tempo", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ aluno: { id: "student-1" }, eventos: [] }),
					{ status: 200 },
				),
			);
		const { result } = renderHook(
			() =>
				useStudentHistory("student-1", {
					turmaId: "class-1",
					q: "rendimento",
					periodo: undefined,
				}),
			{ wrapper },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/students/student-1/history?turmaId=class-1&q=rendimento",
		);
		expect(result.current.data?.aluno.id).toBe("student-1");
	});

	it("propaga erro da API", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Aluno não encontrado" }), {
				status: 404,
			}),
		);
		const { result } = renderHook(() => useStudentHistory("missing"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Aluno não encontrado");
	});

	it("usa mensagem padrão quando o corpo do erro não traz error", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({}), { status: 500 }),
		);
		const { result } = renderHook(() => useStudentHistory("student-1"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Falha ao carregar histórico do aluno",
		);
	});
});

describe("useClassHistory (spec 0012)", () => {
	it("monta URL sem filtros vazios e retorna histórico", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ turma: { id: "class-1" }, eventos: [] }), {
				status: 200,
			}),
		);
		const { result } = renderHook(() => useClassHistory("class-1"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith("/api/classes/class-1/history");
		expect(result.current.data?.turma.id).toBe("class-1");
	});

	it("usa mensagem padrão da turma quando o corpo do erro não traz error", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({}), { status: 500 }),
		);
		const { result } = renderHook(() => useClassHistory("class-1"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Falha ao carregar histórico da turma",
		);
	});
});
