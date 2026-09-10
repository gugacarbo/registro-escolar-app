import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useParticipantName } from "./participant-name";

function wrapper({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

afterEach(() => vi.restoreAllMocks());

describe("useParticipantName", () => {
	it("resolve nomes e mantém fallback por ID", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [{ id: "staff-1", name: "Maria Silva" }],
					total: 1,
					page: 1,
					pageSize: 100,
				}),
			),
		);
		const { result } = renderHook(() => useParticipantName(), { wrapper });
		expect(result.current.getParticipantName("staff-1")).toBe("staff-1");
	});
});
