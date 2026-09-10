import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getStaffQueryKey, useStaff } from "./use-staff";

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => vi.restoreAllMocks());

describe("useStaff", () => {
	it("retorna o prefixo de invalidação", () => {
		expect(getStaffQueryKey()).toEqual(["staff"]);
	});

	it("propaga erro de carregamento", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ error: "Falha" }), { status: 500 }),
		);
		const { result } = renderHook(() => useStaff(), { wrapper });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error).toBeInstanceOf(Error);
	});
});
