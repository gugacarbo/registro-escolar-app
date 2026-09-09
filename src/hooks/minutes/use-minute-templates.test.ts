import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMinuteTemplates } from "./use-minute-templates";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const templates = [
	{
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
	},
];

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useMinuteTemplates", () => {
	it("carrega os modelos de ata", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(templates),
			}),
		);

		const { result } = renderHook(() => useMinuteTemplates(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(templates);
	});

	it("lança erro com mensagem do servidor", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: "Não autenticado" }),
			}),
		);

		const { result } = renderHook(() => useMinuteTemplates(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Não autenticado");
	});
});
