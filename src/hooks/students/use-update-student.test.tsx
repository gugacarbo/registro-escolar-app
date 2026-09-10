import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUpdateStudent } from "./use-update-student";

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

describe("useUpdateStudent", () => {
	it("atualiza o estudante e invalida lista e detalhe", async () => {
		const { client, Wrapper } = createWrapper();
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ id: "student-1", name: "João Souza" }), {
				status: 200,
			}),
		);

		const { result } = renderHook(() => useUpdateStudent("student-1"), {
			wrapper: Wrapper,
		});
		await act(() =>
			result.current.mutateAsync({
				name: "João Souza",
				document: null,
				registrationNumber: null,
				email: null,
				phone: null,
				birthDate: null,
				notes: null,
			}),
		);

		expect(fetchMock).toHaveBeenCalledWith("/api/students/student-1", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "João Souza",
				document: null,
				registrationNumber: null,
				email: null,
				phone: null,
				birthDate: null,
				notes: null,
			}),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["students"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["students", "student-1"],
		});
	});

	it("propaga mensagem de erro e não invalida em falha", async () => {
		const { client, Wrapper } = createWrapper();
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Estudante não encontrado" }), {
				status: 404,
			}),
		);

		const { result } = renderHook(() => useUpdateStudent("missing"), {
			wrapper: Wrapper,
		});
		await expect(
			act(() => result.current.mutateAsync({ name: "Novo" })),
		).rejects.toThrow("Estudante não encontrado");
		expect(invalidateSpy).not.toHaveBeenCalled();
	});
});
