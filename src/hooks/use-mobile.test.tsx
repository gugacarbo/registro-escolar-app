import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useIsMobile } from "./use-mobile";

type Listener = () => void;

function mockMatchMedia(initialWidth: number) {
	const listeners = new Set<Listener>();
	Object.defineProperty(window, "innerWidth", {
		value: initialWidth,
		writable: true,
		configurable: true,
	});
	const addEventListener = vi.fn((_: string, listener: Listener) => {
		listeners.add(listener);
	});
	const removeEventListener = vi.fn((_: string, listener: Listener) => {
		listeners.delete(listener);
	});
	Object.defineProperty(window, "matchMedia", {
		value: vi.fn().mockImplementation(() => ({
			matches: false,
			media: "",
			onchange: null,
			addEventListener,
			removeEventListener,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
		writable: true,
		configurable: true,
	});
	return { listeners, addEventListener, removeEventListener };
}

describe("useIsMobile", () => {
	it("retorna true em telas estreitas e reage a mudanças", () => {
		const { listeners, removeEventListener } = mockMatchMedia(500);

		const { result, unmount } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);

		act(() => {
			Object.defineProperty(window, "innerWidth", {
				value: 1024,
				writable: true,
				configurable: true,
			});
			for (const listener of listeners) listener();
		});
		expect(result.current).toBe(false);

		unmount();
		expect(removeEventListener).toHaveBeenCalled();
	});

	it("retorna false em telas largas", () => {
		mockMatchMedia(1280);

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});
});
