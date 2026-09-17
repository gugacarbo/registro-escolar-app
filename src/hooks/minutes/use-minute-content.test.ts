import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMinuteContent } from "./use-minute-content";

const content = {
	presetId: "preset-1",
	presetName: "Preset Conselho",
	headerContent: JSON.stringify({ type: "doc", content: [] }),
	bodyContent: JSON.stringify({ type: "doc", content: [] }),
	footerContent: JSON.stringify({ type: "doc", content: [] }),
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useMinuteContent", () => {
	it("carrega o conteúdo editável da reunião", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(content),
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client }, children);

		const { result } = renderHook(() => useMinuteContent("meeting-1"), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(content);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/minutes/content",
		);
	});
});
