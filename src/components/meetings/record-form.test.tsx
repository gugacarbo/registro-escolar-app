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
		expect(screen.getByLabelText("Origem do registro")).toBeInTheDocument();
		expect(screen.getByLabelText("Incluir na ata")).toBeInTheDocument();
	});

	it("bloqueia campos quando disabled", () => {
		renderForm(true);
		expect(screen.getByLabelText("Texto *")).toBeDisabled();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
	});

	it("limpa o formulário", () => {
		renderForm();
		fireEvent.change(screen.getByLabelText("Texto *"), {
			target: { value: "Registro" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});

	it("rendera opções de componente e participante com nomes legíveis", async () => {
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
		await user.click(screen.getByLabelText("Origem do registro"));
		await user.click(await screen.findByRole("option", { name: "Maria" }));
		await user.click(screen.getByLabelText("Incluir na ata"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				texto: "Registro válido",
				categoriaId: "",
				componenteId: "component-1",
				origemId: "staff-1",
				incluirNaAta: false,
			}),
			undefined,
		);
	});
});
