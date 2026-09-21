import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAddMeetingClass } from "./use-add-meeting-class";
import { useRemoveMeetingClass } from "./use-remove-meeting-class";

afterEach(() => vi.restoreAllMocks());

function wrapper(client: QueryClient) {
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
}

function createClient() {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	client.invalidateQueries = vi.fn();
	return client;
}

describe("useAddMeetingClass", () => {
	it("vincula turma e invalida turmas/ata", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			Response.json({
				id: "link-1",
				meetingId: "meeting-1",
				classId: "class-1",
			}),
		);
		const client = createClient();
		const { result } = renderHook(() => useAddMeetingClass("meeting-1"), {
			wrapper: wrapper(client),
		});
		result.current.mutate("class-1");
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchSpy).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/classes",
			expect.objectContaining({ method: "POST" }),
		);
		expect(client.invalidateQueries).toHaveBeenCalledTimes(2);
	});

	it("propaga a mensagem de erro do servidor", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			Response.json({ error: "Turma já vinculada à reunião" }, { status: 409 }),
		);
		const client = createClient();
		const { result } = renderHook(() => useAddMeetingClass("meeting-1"), {
			wrapper: wrapper(client),
		});
		result.current.mutate("class-1");
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Turma já vinculada à reunião");
	});
});

describe("useRemoveMeetingClass", () => {
	it("desvincula turma e invalida turmas/ata", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(Response.json({ ok: true }));
		const client = createClient();
		const { result } = renderHook(() => useRemoveMeetingClass("meeting-1"), {
			wrapper: wrapper(client),
		});
		result.current.mutate("class-1");
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchSpy).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/classes/class-1",
			expect.objectContaining({ method: "DELETE" }),
		);
		expect(client.invalidateQueries).toHaveBeenCalledTimes(2);
	});

	it("propaga a mensagem quando a turma tem acompanhamento", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			Response.json(
				{
					error:
						"Turma com acompanhamento registrado: não é possível desvincular",
				},
				{ status: 409 },
			),
		);
		const client = createClient();
		const { result } = renderHook(() => useRemoveMeetingClass("meeting-1"), {
			wrapper: wrapper(client),
		});
		result.current.mutate("class-1");
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toContain("acompanhamento");
	});
});
