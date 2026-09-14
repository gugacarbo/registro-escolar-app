import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GeneralReportDialog } from "./general-report-dialog";

vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: () => ({ data: [] }),
}));
vi.mock("#/components/meetings/participant-name", () => ({
	useParticipantName: () => ({ getParticipantName: (id: string) => id }),
}));

function renderDialog(onSubmit = vi.fn()) {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<GeneralReportDialog meetingId="meeting-1" onSubmit={onSubmit} />
		</QueryClientProvider>,
	);
}

describe("GeneralReportDialog", () => {
	it("abre o formulário somente quando o usuário solicita", async () => {
		const user = userEvent.setup();
		renderDialog();

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Novo relato geral" }));

		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(screen.getByLabelText("Texto *")).toBeVisible();
	});

	it("fecha o dialog depois de criar o relato", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		renderDialog(onSubmit);

		await user.click(screen.getByRole("button", { name: "Novo relato geral" }));
		await user.type(await screen.findByLabelText("Texto *"), "Relato criado");
		await user.click(screen.getByRole("button", { name: "Adicionar relato" }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("mantém o dialog aberto quando a criação falha", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(false);
		renderDialog(onSubmit);

		await user.click(screen.getByRole("button", { name: "Novo relato geral" }));
		await user.type(await screen.findByLabelText("Texto *"), "Relato com erro");
		await user.click(screen.getByRole("button", { name: "Adicionar relato" }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});
