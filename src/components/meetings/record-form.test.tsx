import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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

import { RecordForm } from "./record-form";

function renderForm(disabled = false) {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<RecordForm
				meetingId="meeting-1"
				submitLabel="Salvar"
				disabled={disabled}
				onSubmit={vi.fn()}
			/>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(
			JSON.stringify({ data: [], total: 0, page: 1, pageSize: 100 }),
		),
	);
	mocks.useParticipants.mockReturnValue({ data: [] });
	mocks.useParticipantName.mockReturnValue({
		getParticipantName: (id: string) => id,
	});
});

describe("RecordForm", () => {
	it("renderiza campos obrigatórios e opcionais", () => {
		renderForm();
		expect(screen.getByLabelText("Texto *")).toBeInTheDocument();
		expect(screen.getByLabelText("Componente curricular")).toBeInTheDocument();
		expect(screen.getByLabelText("Quem observou")).toBeInTheDocument();
		expect(screen.getByLabelText("Incluir na ata")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(/Descreva o fato observado/),
		).toBeInTheDocument();
		expect(screen.getByText("0 caracteres")).toBeInTheDocument();
	});

	it("bloqueia campos quando disabled", () => {
		renderForm(true);
		expect(screen.getByLabelText("Texto *")).toBeDisabled();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
	});

	it("só exibe erro de texto após interação (onTouched)", async () => {
		const user = userEvent.setup();
		renderForm();
		// Sem interação: nenhum erro visível (P0 — sem borda vermelha no load).
		expect(screen.queryByText("Texto é obrigatório")).not.toBeInTheDocument();
		const texto = screen.getByLabelText("Texto *");
		await user.click(texto);
		await user.tab();
		expect(await screen.findByText("Texto é obrigatório")).toBeInTheDocument();
	});

	it("pede confirmação ao limpar com conteúdo", async () => {
		const user = userEvent.setup();
		renderForm();
		await user.type(screen.getByLabelText("Texto *"), "Registro");
		await user.click(screen.getByRole("button", { name: "Limpar" }));
		expect(
			screen.getByText("Descartar o que foi digitado?"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Descartar" }));
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});

	it("limpa direto quando vazio", () => {
		renderForm();
		fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});

	it("rendera opções de componente e participante com nomes legíveis", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [{ id: "component-1", name: "Matemática" }],
					total: 1,
					page: 1,
					pageSize: 100,
				}),
			),
		);
		mocks.useParticipants.mockReturnValue({
			data: [{ id: "p-1", staffId: "staff-1" }],
		});
		mocks.useParticipantName.mockReturnValue({
			getParticipantName: (id: string) => (id === "staff-1" ? "Maria" : id),
		});
		render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					serverError="Erro de servidor"
					onSubmit={vi.fn()}
				/>
			</QueryClientProvider>,
		);
		await user.click(screen.getByLabelText("Componente curricular"));
		expect(await screen.findByText("Matemática")).toBeInTheDocument();
		expect(screen.getByText("Maria")).toBeInTheDocument();
		expect(screen.getByText("Erro de servidor")).toBeInTheDocument();
	});

	it("envia IDs de componente e autor, mas apresenta o nome legível", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [{ id: "component-1", name: "Matemática" }],
					total: 1,
					page: 1,
					pageSize: 100,
				}),
			),
		);
		mocks.useParticipants.mockReturnValue({
			data: [{ id: "p-1", staffId: "staff-1" }],
		});
		mocks.useParticipantName.mockReturnValue({
			getParticipantName: () => "Maria",
		});
		render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={onSubmit}
				/>
			</QueryClientProvider>,
		);
		await user.type(screen.getByLabelText("Texto *"), "Registro válido");
		await user.click(screen.getByLabelText("Componente curricular"));
		await user.click(await screen.findByRole("option", { name: "Matemática" }));
		await user.click(screen.getByLabelText("Quem observou"));
		await user.click(await screen.findByRole("option", { name: "Maria" }));
		await user.click(screen.getByLabelText("Incluir na ata"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				texto: "Registro válido",
				categoriaId: null,
				componenteId: "component-1",
				origemId: "staff-1",
				incluirNaAta: false,
			}),
		);
	});

	it("restaura rascunho parcial sem valores ausentes", () => {
		localStorage.setItem(
			"council-record-draft:partial",
			JSON.stringify({ texto: "Só texto" }),
		);
		render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="partial"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("Só texto");
	});

	it("ignora rascunho corrompido e segue com valores padrão", () => {
		localStorage.setItem("council-record-draft:corrompido", "{json inválido");
		render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="corrompido"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});

	it("ignora rascunho vazio e remove rascunho esvaziado", async () => {
		const user = userEvent.setup();
		localStorage.setItem(
			"council-record-draft:vazio",
			JSON.stringify({
				texto: "",
				categoriaId: "",
				componenteId: "",
				origemId: "",
			}),
		);
		const { unmount } = render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="vazio"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
		await user.type(screen.getByLabelText("Texto *"), "x");
		await new Promise((r) => setTimeout(r, 700));
		expect(localStorage.getItem("council-record-draft:vazio")).not.toBeNull();
		await user.clear(screen.getByLabelText("Texto *"));
		await new Promise((r) => setTimeout(r, 700));
		expect(localStorage.getItem("council-record-draft:vazio")).toBeNull();
		unmount();
	});

	it("salva e restaura rascunho automaticamente", async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="meeting-1:student-1"
				/>
			</QueryClientProvider>,
		);
		await user.type(screen.getByLabelText("Texto *"), "Rascunho parcial");
		await new Promise((r) => setTimeout(r, 700));
		unmount();
		render(
			<QueryClientProvider client={new QueryClient()}>
				<RecordForm
					meetingId="meeting-1"
					submitLabel="Salvar"
					onSubmit={vi.fn()}
					draftKey="meeting-1:student-1"
				/>
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Texto *")).toHaveValue("Rascunho parcial");
	});
});
