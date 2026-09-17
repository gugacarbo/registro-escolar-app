import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { textDoc } from "#/lib/minutes/tiptap/serializer";

import { getMinuteContentQueryKey } from "./use-minute-content";
import { useUpdateMinuteContent } from "./use-update-minute-content";
import { getMinutePreviewQueryKey } from "./use-minute-preview";

const values = {
	headerContent: textDoc("Cabeçalho local"),
	bodyContent: textDoc("Corpo local"),
	footerContent: textDoc("Rodapé local"),
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useUpdateMinuteContent", () => {
	it("salva o conteúdo da reunião e invalida a prévia", async () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ ...values, presetId: "preset-1" }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client }, children);
		const { result } = renderHook(() => useUpdateMinuteContent("meeting-1"), {
			wrapper,
		});

		result.current.mutate(values);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/minutes/content",
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			},
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: getMinuteContentQueryKey("meeting-1"),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: getMinutePreviewQueryKey("meeting-1"),
		});
	});
});
