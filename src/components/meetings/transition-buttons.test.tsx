import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
	useTransitionMeeting: vi.fn(),
}));

vi.mock("#/hooks/meetings/use-transition-meeting", () => ({
	useTransitionMeeting: mocks.useTransitionMeeting,
}));

import { TransitionButtons } from "./transition-buttons";

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue(undefined);
	mocks.useTransitionMeeting.mockReturnValue({
		mutateAsync: mocks.mutateAsync,
		isPending: false,
	});
});

describe("TransitionButtons", () => {
	it("pede confirmação contextual antes de finalizar uma reunião", async () => {
		const user = userEvent.setup();
		render(<TransitionButtons meetingId="meeting-1" status="in_progress" />);

		await user.click(screen.getByRole("button", { name: "Finalizar" }));

		expect(
			screen.getByRole("heading", { name: "Finalizar reunião" }),
		).toBeVisible();
		expect(
			screen.getByText(
				"A reunião será marcada como finalizada. Você poderá reabri-la depois se precisar alterar os registros.",
			),
		).toBeVisible();
		expect(mocks.mutateAsync).not.toHaveBeenCalled();
	});

	it("exibe o erro da transição dentro do diálogo de confirmação", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockRejectedValue(
			new Error("Não foi possível finalizar"),
		);
		render(<TransitionButtons meetingId="meeting-1" status="in_progress" />);

		await user.click(screen.getByRole("button", { name: "Finalizar" }));
		await user.click(
			screen.getByRole("button", { name: "Confirmar finalização" }),
		);

		const dialog = screen.getByRole("dialog", { name: "Finalizar reunião" });
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível finalizar",
		);
		expect(dialog).toContainElement(screen.getByRole("alert"));
	});

	it("executa a transição somente após a confirmação", async () => {
		const user = userEvent.setup();
		render(<TransitionButtons meetingId="meeting-1" status="in_progress" />);

		await user.click(screen.getByRole("button", { name: "Finalizar" }));
		await user.click(
			screen.getByRole("button", { name: "Confirmar finalização" }),
		);

		expect(mocks.mutateAsync).toHaveBeenCalledWith("finalize");
	});
});
