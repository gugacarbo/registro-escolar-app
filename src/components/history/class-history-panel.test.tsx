import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useClassHistory: vi.fn() }));
vi.mock("#/hooks/history/use-history", () => ({
	useClassHistory: mocks.useClassHistory,
}));

import { ClassHistoryPanel } from "./class-history-panel";

function renderPanel() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<ClassHistoryPanel classId="class-1" />
		</QueryClientProvider>,
	);
}

describe("ClassHistoryPanel", () => {
	it("renderiza resumo e eventos da turma", () => {
		mocks.useClassHistory.mockReturnValue({
			data: {
				turma: { id: "class-1", name: "Turma A" },
				estudantes: [{ id: "student-1" }],
				reunioes: [{ id: "meeting-1" }],
				eventos: [
					{
						id: "event-1",
						tipo: "matricula",
						data: "2026-01-01T00:00:00Z",
						texto: null,
						turmaNome: "Turma A",
						interno: false,
					},
				],
			},
			isLoading: false,
			isError: false,
		});
		renderPanel();
		expect(
			screen.getByRole("heading", { name: "Histórico da turma" }),
		).toBeInTheDocument();
		expect(screen.getByText("1 estudantes")).toBeInTheDocument();
		expect(screen.getByText("1 reuniões")).toBeInTheDocument();
		expect(screen.getByText("Matrícula")).toBeInTheDocument();
	});

	it("aplica filtros de histórico da turma", async () => {
		const user = userEvent.setup();
		// Simula as páginas de componentes usadas pelo select do formulário.
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					({
						ok: true,
						json: async () => ({
							data: [{ id: "component-1", name: "Matemática" }],
							total: 1,
						}),
					}) as unknown as Response,
			),
		);
		try {
			mocks.useClassHistory.mockReturnValue({
				data: {
					turma: { id: "class-1", name: "Turma A" },
					estudantes: [],
					reunioes: [],
					eventos: [],
				},
				isLoading: false,
				isError: false,
			});
			renderPanel();
			await user.type(screen.getByLabelText("Busca"), "conselho");
			await user.click(screen.getByRole("combobox", { name: "Componente" }));
			await user.click(
				await screen.findByRole("option", { name: "Matemática" }),
			);
			await user.type(screen.getByLabelText("Período"), "2026");
			await user.click(screen.getByRole("button", { name: "Filtrar" }));
		} finally {
			vi.unstubAllGlobals();
		}
		expect(mocks.useClassHistory).toHaveBeenLastCalledWith("class-1", {
			q: "conselho",
			componenteId: "component-1",
			periodo: "2026",
		});
	});

	it("exibe erro", () => {
		mocks.useClassHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPanel();
		expect(
			screen.getByText("Não foi possível carregar o histórico."),
		).toBeInTheDocument();
	});

	it("exibe loading, erro, estado vazio e vínculos históricos", () => {
		mocks.useClassHistory.mockReturnValueOnce({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		const { rerender } = renderPanel();
		expect(document.querySelector("[data-slot=skeleton]")).toBeInTheDocument();

		mocks.useClassHistory.mockReturnValueOnce({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		rerender(
			<QueryClientProvider client={new QueryClient()}>
				<ClassHistoryPanel classId="class-1" />
			</QueryClientProvider>,
		);
		expect(
			screen.getByText("Não foi possível carregar o histórico."),
		).toBeInTheDocument();

		mocks.useClassHistory.mockReturnValueOnce({
			data: {
				turma: { id: "class-1", name: "Turma A", academicPeriod: "2026" },
				estudantes: [],
				reunioes: [],
				eventos: [],
			},
			isLoading: false,
			isError: false,
		});
		rerender(
			<QueryClientProvider client={new QueryClient()}>
				<ClassHistoryPanel classId="class-1" />
			</QueryClientProvider>,
		);
		expect(screen.getByText("0 estudantes")).toBeInTheDocument();

		mocks.useClassHistory.mockReturnValue({
			data: {
				turma: { id: "class-1", name: "Turma A", academicPeriod: "2026" },
				estudantes: [
					{
						studentId: "student-1",
						name: "João",
						status: "encerrada",
						startDate: "2026-01-01T00:00:00Z",
						endDate: "2026-06-01T00:00:00Z",
					},
					{
						studentId: "student-2",
						name: "Maria",
						status: "ativa",
						startDate: "2026-01-01T00:00:00Z",
						endDate: null,
					},
				],
				reunioes: [
					{
						id: "meeting-1",
						title: "Conselho",
						status: "finalizada",
						heldAt: null,
					},
				],
				eventos: [],
			},
			isLoading: false,
			isError: false,
		});
		rerender(
			<QueryClientProvider client={new QueryClient()}>
				<ClassHistoryPanel classId="class-1" />
			</QueryClientProvider>,
		);
		expect(screen.getByText("Histórico")).toBeInTheDocument();
		expect(screen.getByText("Ativo")).toBeInTheDocument();
	});
});
