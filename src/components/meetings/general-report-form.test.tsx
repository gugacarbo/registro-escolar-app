import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
	localStorage.clear();
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
		expect(screen.getByLabelText("Quem observou")).toBeInTheDocument();
		expect(mocks.useParticipants().data).toHaveLength(1);
		expect(mocks.useParticipantName().getParticipantName("staff-1")).toBe(
			"Maria",
		);
	});

	it("só exibe erro de texto após interação (onTouched)", async () => {
		const user = userEvent.setup();
		renderForm();
		expect(screen.queryByText("Texto é obrigatório")).not.toBeInTheDocument();
		const texto = screen.getByLabelText("Texto *");
		await user.click(texto);
		await user.tab();
		expect(await screen.findByText("Texto é obrigatório")).toBeInTheDocument();
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
		await user.click(screen.getByLabelText("Quem observou"));
		await user.click(await screen.findByRole("option", { name: "Maria" }));
		await user.click(screen.getByLabelText("Incluir na ata"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				texto: "Relato geral",
				origemId: "staff-1",
				incluirNaAta: false,
			}),
		);
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});

	it("salva e restaura rascunho automaticamente", async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="meeting-1"
				/>
			</QueryClientProvider>,
		);
		await user.type(screen.getByLabelText("Texto *"), "Relato parcial");
		await new Promise((r) => setTimeout(r, 700));
		unmount();
		render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="meeting-1"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("Relato parcial");
	});

	it("limpa rascunho ao descartar e exibe erro de servidor", async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					serverError="Falha no servidor"
					onSubmit={vi.fn()}
					draftKey="meeting-1"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByText("Falha no servidor")).toBeInTheDocument();
		await user.type(screen.getByLabelText("Texto *"), "Para descartar");
		await new Promise((r) => setTimeout(r, 700));
		expect(
			localStorage.getItem("council-general-report-draft:meeting-1"),
		).not.toBeNull();
		await user.click(screen.getByRole("button", { name: "Limpar" }));
		expect(
			screen.getByText("Descartar o que foi digitado?"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Descartar" }));
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
		expect(
			localStorage.getItem("council-general-report-draft:meeting-1"),
		).toBeNull();
		unmount();
	});

	it("restaura rascunho parcial sem valores ausentes", () => {
		localStorage.setItem(
			"council-general-report-draft:parcial",
			JSON.stringify({ origemId: "staff-1" }),
		);
		render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="parcial"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});

	it("remove rascunho esvaziado no autosave", async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="esvaziar"
				/>
			</QueryClientProvider>,
		);
		await user.type(screen.getByLabelText("Texto *"), "x");
		await new Promise((r) => setTimeout(r, 700));
		expect(
			localStorage.getItem("council-general-report-draft:esvaziar"),
		).not.toBeNull();
		await user.clear(screen.getByLabelText("Texto *"));
		await new Promise((r) => setTimeout(r, 700));
		expect(
			localStorage.getItem("council-general-report-draft:esvaziar"),
		).toBeNull();
		unmount();
	});

	it("ignora rascunho corrompido e segue com valores padrão", () => {
		localStorage.setItem(
			"council-general-report-draft:meeting-1",
			"{json inválido",
		);
		render(
			<QueryClientProvider client={new QueryClient()}>
				<GeneralReportForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="meeting-1"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});
});
