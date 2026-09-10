import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUpdateMeeting } from "./use-update-meeting";

afterEach(() => vi.restoreAllMocks());

describe("useUpdateMeeting", () => {
	it("atualiza reunião e invalida consultas dependentes", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(Response.json({ id: "meeting-1", title: "Nova" }));
		const invalidate = vi.fn();
		const client = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		client.invalidateQueries = invalidate;
		const { result } = renderHook(() => useUpdateMeeting("meeting-1"), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			),
		});
		result.current.mutate({ title: "Nova" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchSpy).toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalledTimes(2);
	});
});
