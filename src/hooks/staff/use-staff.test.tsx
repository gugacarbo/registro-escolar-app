import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useStaff } from "./use-staff";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useStaff", () => {
	it("busca a página com search, page e pageSize", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					data: [{ id: "staff-1", name: "João" }],
					total: 1,
					page: 2,
					pageSize: 10,
				}),
				{ status: 200 },
			),
		);
		const { result } = renderHook(
			() => useStaff({ search: "João", page: 2, pageSize: 10 }),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const url = new URL(
			fetchMock.mock.calls[0][0] as string,
			"http://localhost",
		);
		expect(url.pathname).toBe("/api/staff");
		expect(url.searchParams.get("search")).toBe("João");
		expect(url.searchParams.get("page")).toBe("2");
		expect(url.searchParams.get("pageSize")).toBe("10");
		expect(result.current.data).toMatchObject({ total: 1, page: 2 });
	});

	it("usa page 1 e pageSize 10 como padrão", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ data: [], total: 0, page: 1, pageSize: 10 }),
					{ status: 200 },
				),
			);
		const { result } = renderHook(() => useStaff(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const url = new URL(
			fetchMock.mock.calls[0][0] as string,
			"http://localhost",
		);
		expect(url.searchParams.get("page")).toBe("1");
		expect(url.searchParams.get("pageSize")).toBe("10");
		expect(url.searchParams.has("search")).toBe(false);
	});

	it("propaga erro de carregamento", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Falha" }), { status: 500 }),
		);
		const { result } = renderHook(() => useStaff(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
	});
});
