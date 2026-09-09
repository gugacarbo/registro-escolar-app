import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMinutePreview } from "./use-minute-preview";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const preview = {
	meetingId: "meeting-1",
	templateId: null,
	status: "finished",
	approvalStatus: "pendente_aprovacao",
	content: "Ata da reunião",
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useMinutePreview", () => {
	it("carrega a prévia da ata", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(preview),
			}),
		);

		const { result } = renderHook(() => useMinutePreview("meeting-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(preview);
	});

	it("lança erro com mensagem do servidor", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: "Reunião não encontrada" }),
			}),
		);

		const { result } = renderHook(() => useMinutePreview("meeting-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Reunião não encontrada");
	});
});
