import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useComponent } from "./components/use-component";
import { useMeeting } from "./meetings/use-meeting";
import { useRole } from "./roles/use-role";
import { useStaffMember } from "./staff/use-staff-member";

function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider
			client={
				new QueryClient({ defaultOptions: { queries: { retry: false } } })
			}
		>
			{children}
		</QueryClientProvider>
	);
}

afterEach(() => vi.restoreAllMocks());

describe("hooks de consulta por id", () => {
	it("carregam recursos e propagam erros", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response(JSON.stringify({ id: "id-1" })),
		);
		for (const useHook of [useComponent, useMeeting, useRole, useStaffMember]) {
			const success = renderHook(() => useHook("id-1"), { wrapper });
			await waitFor(() => expect(success.result.current.isSuccess).toBe(true));
		}

		vi.restoreAllMocks();
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () =>
				new Response(JSON.stringify({ error: "Não encontrado" }), {
					status: 404,
				}),
		);
		for (const useHook of [useComponent, useMeeting, useRole, useStaffMember]) {
			const failure = renderHook(() => useHook("missing"), { wrapper });
			await waitFor(() => expect(failure.result.current.isError).toBe(true));
		}
	});
});
