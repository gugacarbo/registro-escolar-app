import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMinutesQueryKey, useMinutes } from "./use-minutes";

const minutesPage = {
	data: [
		{
			id: "minute-1",
			meetingId: "meeting-1",
			meetingTitle: "Reunião 1",
			approvalStatus: "aprovada",
			approvedAt: null,
			currentVersion: 1,
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
	],
	total: 1,
	page: 1,
	pageSize: 10,
};

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useMinutes", () => {
	it("carrega a lista paginada de atas", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(minutesPage),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(
			() =>
				useMinutes({ search: "reuni", approvalStatus: "aprovada", page: 2 }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(minutesPage);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/minutes?search=reuni&approvalStatus=aprovada&page=2&pageSize=10",
		);
	});

	it("usa prefixo comum de query key sem filtros", () => {
		expect(getMinutesQueryKey()).toEqual(["minutes"]);
		expect(getMinutesQueryKey("a")).not.toEqual(["minutes"]);
	});

	it("lança erro com mensagem fixa quando a resposta falha", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }),
		);

		const { result } = renderHook(() => useMinutes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Falha ao carregar atas");
	});
});
