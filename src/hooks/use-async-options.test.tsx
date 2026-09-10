import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAsyncOptions } from "./use-async-options";

function wrapper({ children }: { children: React.ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAsyncOptions", () => {
	it("agrega páginas até carregar tudo", async () => {
		const fetchPage = vi.fn(async ({ page }: { page: number }) => {
			if (page === 1) return { data: [{ id: "1", name: "A" }], total: 2 };
			return { data: [{ id: "2", name: "B" }], total: 2 };
		});
		const { result } = renderHook(
			() =>
				useAsyncOptions({
					queryKey: ["test", "all"],
					fetchPage,
					select: (item: { id: string; name: string }) => item,
					pageSize: 1,
				}),
			{ wrapper },
		);
		await waitFor(() => expect(result.current.data?.loadedAll).toBe(true));
		expect(result.current.data?.options).toHaveLength(2);
		expect(result.current.data?.total).toBe(2);
	});

	it("sinaliza resultado parcial quando há mais páginas que o limite", async () => {
		const fetchPage = vi.fn(async () => ({
			data: [{ id: "1", name: "A" }],
			total: 50,
		}));
		const { result } = renderHook(
			() =>
				useAsyncOptions({
					queryKey: ["test", "partial"],
					fetchPage,
					select: (item: { id: string; name: string }) => item,
					pageSize: 1,
					maxPages: 2,
				}),
			{ wrapper },
		);
		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data?.loadedAll).toBe(false);
		expect(result.current.data?.total).toBe(50);
	});
});
