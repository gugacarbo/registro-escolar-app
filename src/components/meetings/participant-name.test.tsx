import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useParticipantName } from "./participant-name";

function wrapper({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

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
		await waitFor(() => expect(result.current.total).toBe(1));
		expect(result.current.getParticipantName("staff-1")).toBe("Maria Silva");
		expect(result.current.getParticipantName("desconhecido")).toBe(
			"desconhecido",
		);
	});
	it("resolve nomes com busca aplicada", async () => {
		const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [{ id: "staff-1", name: "Maria Silva" }],
					total: 1,
					page: 1,
					pageSize: 100,
				}),
			),
		);
		const { result } = renderHook(() => useParticipantName("Maria"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.total).toBe(1));
		await waitFor(() =>
			expect(String(spy.mock.calls.at(-1)?.[0])).toContain("search=Maria"),
		);
		expect(result.current.getParticipantName("staff-1")).toBe("Maria Silva");
	});
});
