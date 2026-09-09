import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useCreateOffer } from "./use-create-offer";

function createWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

describe("useCreateOffer", () => {
	it("invalida ofertas da turma após sucesso", async () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		await client.prefetchQuery({
			queryKey: ["classes", "class-1", "offers"],
			queryFn: () => Promise.resolve([]),
		});
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ id: "offer-1" }), { status: 201 }),
			);

		const { result } = renderHook(() => useCreateOffer(), {
			wrapper: createWrapper(client),
		});
		await act(() =>
			result.current.mutateAsync({
				turmaId: "class-1",
				componenteId: "component-1",
				professorIds: [],
			}),
		);

		expect(fetchMock).toHaveBeenCalledWith("/api/classes/class-1/offers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				componenteId: "component-1",
				professorIds: [],
			}),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["classes", "class-1", "offers"],
		});
	});

	it("propaga mensagem de erro e não invalida em falha", async () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Oferta já existe" }), {
				status: 409,
			}),
		);

		const { result } = renderHook(() => useCreateOffer(), {
			wrapper: createWrapper(client),
		});
		await expect(
			act(() =>
				result.current.mutateAsync({
					turmaId: "class-1",
					componenteId: "component-1",
					professorIds: [],
				}),
			),
		).rejects.toThrow("Oferta já existe");
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(invalidateSpy).not.toHaveBeenCalled();
	});
});
