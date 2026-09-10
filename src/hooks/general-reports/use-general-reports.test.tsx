import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	useCreateGeneralReport,
	useGeneralReports,
	useUpdateGeneralReport,
} from "./use-general-reports";

const report = {
	id: "report-1",
	meetingId: "meeting-1",
	texto: "Relato",
	originId: null,
	categoryId: null,
	includeInMinutes: true,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("hooks de relatos gerais", () => {
	it("lista relatos da reunião", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(new Response(JSON.stringify([report])));
		const { result } = renderHook(() => useGeneralReports("meeting-1"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/general-reports",
		);
		expect(result.current.data).toEqual([report]);
	});

	it("cria relato geral", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(JSON.stringify(report), { status: 201 }));
		const { result } = renderHook(() => useCreateGeneralReport("meeting-1"), {
			wrapper,
		});
		result.current.mutate({ texto: "Relato", incluirNaAta: false });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/general-reports",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("edita relato geral", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(JSON.stringify(report)));
		const { result } = renderHook(() => useUpdateGeneralReport("meeting-1"), {
			wrapper,
		});
		result.current.mutate({ reportId: "report-1", texto: "Editado" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/general-reports/report-1",
			expect.objectContaining({ method: "PATCH" }),
		);
	});

	it("propaga erro do servidor", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ error: "Reunião finalizada" }), {
				status: 409,
			}),
		);
		const { result } = renderHook(() => useCreateGeneralReport("meeting-1"), {
			wrapper,
		});
		result.current.mutate({ texto: "Relato" });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Reunião finalizada");
	});
});
