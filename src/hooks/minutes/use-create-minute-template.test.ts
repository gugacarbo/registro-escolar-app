import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCreateMinuteTemplate } from "./use-create-minute-template";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const created = {
	id: "template-1",
	name: "Modelo padrão",
	headerText: "",
	footerText: "",
	showMeeting: true,
	showClasses: true,
	showParticipants: true,
	showRecords: true,
	showGeneralReports: true,
	showSignatures: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useCreateMinuteTemplate", () => {
	it("cria um modelo de ata", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(created),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useCreateMinuteTemplate(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			name: "Modelo padrão",
			headerText: "",
			footerText: "",
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(created);
		expect(fetchMock).toHaveBeenCalledWith("/api/minute-templates", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Modelo padrão",
				headerText: "",
				footerText: "",
			}),
		});
	});

	it("propaga erro do servidor", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: "Nome do modelo é obrigatório" }),
			}),
		);

		const { result } = renderHook(() => useCreateMinuteTemplate(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ name: "", headerText: "", footerText: "" });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Nome do modelo é obrigatório");
	});
});
