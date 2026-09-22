import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMeetingsQueryKey, useMeetings } from "./use-meetings";

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

describe("useMeetings", () => {
	it("busca a página com search, status, page e pageSize", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					data: [{ id: "meeting-1", title: "Reunião", status: "open" }],
					total: 1,
					page: 2,
					pageSize: 10,
				}),
				{ status: 200 },
			),
		);
		const { result } = renderHook(
			() =>
				useMeetings({
					search: "Reunião",
					status: "open",
					page: 2,
					pageSize: 10,
				}),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const url = new URL(
			fetchMock.mock.calls[0][0] as string,
			"http://localhost",
		);
		expect(url.pathname).toBe("/api/meetings");
		expect(url.searchParams.get("search")).toBe("Reunião");
		expect(url.searchParams.get("status")).toBe("open");
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
		const { result } = renderHook(() => useMeetings(), {
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
		expect(url.searchParams.has("status")).toBe(false);
	});

	it("propaga erro de carregamento", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Falha" }), { status: 500 }),
		);
		const { result } = renderHook(() => useMeetings(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
	});

	it("getMeetingsQueryKey sem args retorna o prefixo de invalidação", async () => {
		expect(getMeetingsQueryKey()).toEqual(["meetings"]);
		expect(getMeetingsQueryKey("busca", "open")).toEqual([
			"meetings",
			{ search: "busca", status: "open", page: 1, pageSize: 10 },
		]);
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ data: [], total: 0, page: 1, pageSize: 10 }),
					{ status: 200 },
				),
			);
		const { result } = renderHook(() => useMeetings({ status: "open" }), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const url = new URL(
			fetchMock.mock.calls[0][0] as string,
			"http://localhost",
		);
		expect(url.searchParams.get("status")).toBe("open");
	});
});
