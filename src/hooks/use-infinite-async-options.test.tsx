import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useInfiniteAsyncOptions } from "./use-infinite-async-options";

function wrapper({ children }: { children: React.ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useInfiniteAsyncOptions", () => {
	it("carrega a primeira página e agrega páginas subsequentes via fetchNextPage", async () => {
		const fetchPage = vi.fn(
			async ({ page }: { page: number; pageSize: number }) => {
				if (page === 1) {
					return {
						data: [{ id: "1", name: "Estudante 1", reference: "REF-1" }],
						total: 2,
					};
				}
				return {
					data: [{ id: "2", name: "Estudante 2", reference: "REF-2" }],
					total: 2,
				};
			},
		);

		const { result } = renderHook(
			() =>
				useInfiniteAsyncOptions({
					queryKey: ["test", "infinite"],
					fetchPage,
					select: (item) => item,
					pageSize: 1,
				}),
			{ wrapper },
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.options).toHaveLength(1);
		expect(result.current.options[0].name).toBe("Estudante 1");
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.total).toBe(2);

		// Carrega próxima página
		await act(async () => {
			await result.current.fetchNextPage();
		});

		await waitFor(() => expect(result.current.options).toHaveLength(2));
		expect(result.current.options[1].name).toBe("Estudante 2");
		expect(result.current.hasNextPage).toBe(false);
	});
});
