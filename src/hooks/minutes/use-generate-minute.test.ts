import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGenerateMinute } from "./use-generate-minute";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const generated = {
	minuteId: "minute-1",
	version: 2,
	isCurrent: true,
	createdAt: new Date().toISOString(),
	approvalStatus: "pendente_aprovacao",
	pdfSize: 123,
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useGenerateMinute", () => {
	it("gera nova versão da ata", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(generated),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useGenerateMinute("meeting-1"), {
			wrapper: createWrapper(),
		});

		result.current.mutate({});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(generated);
		expect(fetchMock).toHaveBeenCalledWith("/api/meetings/meeting-1/minutes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
	});

	it("propaga erro do servidor ao gerar em rascunho", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () =>
					Promise.resolve({ error: "Reunião em rascunho não gera versão" }),
			}),
		);

		const { result } = renderHook(() => useGenerateMinute("meeting-1"), {
			wrapper: createWrapper(),
		});

		result.current.mutate({});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Reunião em rascunho não gera versão",
		);
	});
});
