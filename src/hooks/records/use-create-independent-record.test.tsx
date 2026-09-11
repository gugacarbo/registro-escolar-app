import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCreateIndependentRecord } from "./use-create-independent-record";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const Wrapper = function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
	return { client, Wrapper };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useCreateIndependentRecord", () => {
	it("cria o registro independente e invalida o histórico do estudante", async () => {
		const { client, Wrapper } = createWrapper();
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: "record-1",
					studentId: "student-1",
					texto: "Observação independente",
					includeInMinutes: true,
				}),
				{ status: 201 },
			),
		);

		const { result } = renderHook(() => useCreateIndependentRecord(), {
			wrapper: Wrapper,
		});
		const record = await act(() =>
			result.current.mutateAsync({
				studentId: "student-1",
				texto: "Observação independente",
				turmaId: "class-1",
				categoriaId: "Comportamento",
				componenteId: "component-1",
				incluirNaAta: false,
			}),
		);

		expect(record.id).toBe("record-1");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/students/student-1/records",
			expect.objectContaining({ method: "POST" }),
		);
		expect(
			JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
		).toEqual({
			texto: "Observação independente",
			turmaId: "class-1",
			categoriaId: "Comportamento",
			componenteId: "component-1",
			incluirNaAta: false,
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["students", "student-1", "history"],
		});
	});

	it("envia nulos quando os campos opcionais estão ausentes", async () => {
		const { Wrapper } = createWrapper();
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ id: "record-1", studentId: "student-1" }), {
				status: 201,
			}),
		);

		const { result } = renderHook(() => useCreateIndependentRecord(), {
			wrapper: Wrapper,
		});
		await act(() =>
			result.current.mutateAsync({
				studentId: "student-1",
				texto: "Somente o texto",
			}),
		);

		expect(
			JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
		).toEqual({
			texto: "Somente o texto",
			turmaId: null,
			categoriaId: null,
			componenteId: null,
			incluirNaAta: true,
		});
	});

	it("propaga mensagem de erro e não invalida em falha", async () => {
		const { client, Wrapper } = createWrapper();
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Dados inválidos" }), {
				status: 400,
			}),
		);

		const { result } = renderHook(() => useCreateIndependentRecord(), {
			wrapper: Wrapper,
		});
		await expect(
			act(() =>
				result.current.mutateAsync({
					studentId: "student-1",
					texto: "x",
				}),
			),
		).rejects.toThrow("Dados inválidos");
		expect(invalidateSpy).not.toHaveBeenCalled();
	});
});
