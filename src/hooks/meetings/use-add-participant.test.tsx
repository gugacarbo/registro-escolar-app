import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAddParticipant } from "./use-add-participant";

function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

afterEach(() => vi.restoreAllMocks());

describe("useAddParticipant", () => {
	it("propaga mensagem específica do servidor", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ error: "Participante já adicionado" }), {
				status: 409,
			}),
		);
		const { result } = renderHook(() => useAddParticipant("meeting-1"), {
			wrapper,
		});
		result.current.mutate({ staffId: "staff-1", roleId: "role-1" });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Participante já adicionado");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/participants",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("usa mensagem padrão quando o corpo não traz error", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("{}", { status: 500 }),
		);
		const { result } = renderHook(() => useAddParticipant("meeting-1"), {
			wrapper,
		});
		result.current.mutate({ staffId: "staff-1", roleId: "role-1" });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Falha ao adicionar participante",
		);
	});
});
