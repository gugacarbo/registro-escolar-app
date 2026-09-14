import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useCreateEnrollment } from "./use-create-enrollment";

describe("useCreateEnrollment", () => {
	it("invalida listas e detalhes de estudantes e turmas após matricular", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ enrollment: {}, closedEnrollments: [] }), {
				status: 201,
			}),
		);
		const queryClient = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		function Wrapper({ children }: { children: ReactNode }) {
			return (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);
		}

		const { result } = renderHook(() => useCreateEnrollment(), {
			wrapper: Wrapper,
		});
		await result.current.mutateAsync({
			estudanteId: "student-1",
			turmaId: "class-1",
			dataInicio: "2026-02-01",
			status: "ativa",
		});
		await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["enrollments"],
		});
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["classes"] });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["students"] });
	});
});
