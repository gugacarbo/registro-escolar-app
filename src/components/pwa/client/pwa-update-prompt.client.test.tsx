import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useRegisterSW: vi.fn(),
}));

vi.mock("virtual:pwa-register/react", () => ({
	useRegisterSW: mocks.useRegisterSW,
}));

import { PwaUpdatePrompt } from "./pwa-update-prompt.client";

function renderPrompt(options: {
	needRefresh: boolean;
	updateServiceWorker?: ReturnType<typeof vi.fn>;
}) {
	const updateServiceWorker =
		options.updateServiceWorker ?? vi.fn().mockResolvedValue(undefined);
	mocks.useRegisterSW.mockReturnValue({
		needRefresh: [options.needRefresh, vi.fn()],
		offlineReady: [false, vi.fn()],
		updateServiceWorker,
	});

	return {
		updateServiceWorker,
		...render(<PwaUpdatePrompt />),
	};
}

describe("PwaUpdatePrompt", () => {
	it("fica oculto enquanto não há atualização", () => {
		renderPrompt({ needRefresh: false });

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("exige consentimento antes de atualizar o service worker", () => {
		const { updateServiceWorker } = renderPrompt({ needRefresh: true });

		fireEvent.click(screen.getByRole("button", { name: "Depois" }));
		expect(updateServiceWorker).toHaveBeenCalledWith(false);

		fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
		expect(updateServiceWorker).toHaveBeenCalledWith(true);
	});
});
