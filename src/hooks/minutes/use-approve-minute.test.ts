import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useApproveMinute } from "./use-approve-minute";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const approved = {
	id: "minute-1",
	meetingId: "meeting-1",
	approvalStatus: "aprovada",
	approvedAt: new Date().toISOString(),
	approvalNotes: null,
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useApproveMinute", () => {
	it("aprova a ata", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(approved),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useApproveMinute("meeting-1"), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ observacao: "Ok" });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(approved);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/minutes/approve",
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ observacao: "Ok" }),
			},
		);
	});

	it("propaga erro do servidor", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: "Ata já aprovada" }),
			}),
		);

		const { result } = renderHook(() => useApproveMinute("meeting-1"), {
			wrapper: createWrapper(),
		});

		result.current.mutate({});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Ata já aprovada");
	});
});
