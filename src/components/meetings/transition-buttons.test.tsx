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
	it("não oferece transições em reunião aberta", () => {
		render(<TransitionButtons meetingId="meeting-1" status="open" />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("pede confirmação contextual antes de reabrir uma reunião encerrada", async () => {
		const user = userEvent.setup();
		render(<TransitionButtons meetingId="meeting-1" status="closed" />);

		await user.click(screen.getByRole("button", { name: "Reabrir" }));

		expect(
			screen.getByRole("heading", { name: "Reabrir reunião" }),
		).toBeVisible();
		expect(
			screen.getByText(
				"A reunião voltará a aceitar alterações e deixará de constar como encerrada. Gere a ata novamente ao concluir.",
			),
		).toBeVisible();
		expect(mocks.mutateAsync).not.toHaveBeenCalled();
	});

	it("exibe o erro da transição dentro do diálogo de confirmação", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockRejectedValue(new Error("Não foi possível reabrir"));
		render(<TransitionButtons meetingId="meeting-1" status="closed" />);

		await user.click(screen.getByRole("button", { name: "Reabrir" }));
		await user.click(
			screen.getByRole("button", { name: "Confirmar reabertura" }),
		);

		const dialog = screen.getByRole("dialog", { name: "Reabrir reunião" });
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível reabrir",
		);
		expect(dialog).toContainElement(screen.getByRole("alert"));
	});

	it("executa a transição somente após a confirmação", async () => {
		const user = userEvent.setup();
		render(<TransitionButtons meetingId="meeting-1" status="closed" />);

		await user.click(screen.getByRole("button", { name: "Reabrir" }));
		await user.click(
			screen.getByRole("button", { name: "Confirmar reabertura" }),
		);

		expect(mocks.mutateAsync).toHaveBeenCalledWith("reopen");
	});
});
