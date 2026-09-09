import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMinuteVersions } from "./use-minute-versions";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const versions = [
	{
		id: "v1",
		minuteId: "minute-1",
		version: 1,
		isCurrent: true,
		notes: null,
		createdAt: new Date().toISOString(),
		hasPdf: true,
	},
];

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useMinuteVersions", () => {
	it("carrega as versões da ata", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(versions),
			}),
		);

		const { result } = renderHook(() => useMinuteVersions("meeting-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(versions);
	});

	it("lança erro com mensagem do servidor", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: "Ata não encontrada" }),
			}),
		);

		const { result } = renderHook(() => useMinuteVersions("meeting-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Ata não encontrada");
	});
});
