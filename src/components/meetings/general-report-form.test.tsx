import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useParticipants: vi.fn(),
	useParticipantName: vi.fn(),
}));

vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: mocks.useParticipants,
}));
vi.mock("#/components/meetings/participant-name", () => ({
	useParticipantName: mocks.useParticipantName,
}));

import { GeneralReportForm } from "./general-report-form";

function renderForm() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<GeneralReportForm
				meetingId="meeting-1"
				submitLabel="Salvar"
				onSubmit={vi.fn()}
			/>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useParticipants.mockReturnValue({
		data: [{ id: "p-1", staffId: "staff-1" }],
	});
	mocks.useParticipantName.mockReturnValue({
		getParticipantName: (id: string) => (id === "staff-1" ? "Maria" : id),
	});
});

describe("GeneralReportForm", () => {
	it("renderiza o seletor de autor participante", () => {
		renderForm();
		expect(screen.getByLabelText("Autor do relato")).toBeInTheDocument();
		expect(mocks.useParticipants().data).toHaveLength(1);
		expect(mocks.useParticipantName().getParticipantName("staff-1")).toBe(
			"Maria",
		);
	});

	it("envia valores do formulário e permite limpar", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={onSubmit}
				/>
			</QueryClientProvider>,
		);
		await user.type(screen.getByLabelText("Texto *"), "Relato geral");
		await user.click(screen.getByLabelText("Autor do relato"));
		await user.click(await screen.findByRole("option", { name: "Maria" }));
		await user.click(screen.getByLabelText("Incluir na ata"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				texto: "Relato geral",
				origemId: "staff-1",
				incluirNaAta: false,
			}),
			undefined,
		);
		await user.click(screen.getByRole("button", { name: "Limpar" }));
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});
});
