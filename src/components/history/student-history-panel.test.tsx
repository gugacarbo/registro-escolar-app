import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useStudentHistory: vi.fn(),
	useClasses: vi.fn(),
	useComponents: vi.fn(),
}));

vi.mock("#/hooks/history/use-history", () => ({
	useStudentHistory: mocks.useStudentHistory,
}));
vi.mock("#/hooks/classes/use-classes", () => ({
	useClasses: mocks.useClasses,
}));
vi.mock("#/hooks/components/use-components", () => ({
	useComponents: mocks.useComponents,
}));

import { StudentHistoryPanel } from "./student-history-panel";

function renderPanel() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<StudentHistoryPanel studentId="student-1" />
		</QueryClientProvider>,
	);
}

afterEach(() => vi.clearAllMocks());

describe("StudentHistoryPanel", () => {
	it("renderiza eventos do histórico", () => {
		mocks.useClasses.mockReturnValue({ data: { data: [] } });
		mocks.useComponents.mockReturnValue({ data: { data: [] } });
		mocks.useStudentHistory.mockReturnValue({
			data: {
				estudante: { id: "student-1", name: "João" },
				eventos: [
					{
						id: "event-1",
						tipo: "registro",
						data: "2026-01-01T00:00:00Z",
						texto: "Acompanhamento",
						turmaNome: "Turma A",
						reuniaoTitulo: "Conselho",
						interno: false,
					},
				],
			},
			isLoading: false,
			isError: false,
		});
		renderPanel();
		expect(
			screen.getByRole("heading", { name: "Linha do tempo" }),
		).toBeInTheDocument();
		expect(screen.getByText("Acompanhamento")).toBeInTheDocument();
	});

	it("exibe carregamento e erro", () => {
		mocks.useClasses.mockReturnValue({ data: { data: [] } });
		mocks.useComponents.mockReturnValue({ data: { data: [] } });
		mocks.useStudentHistory.mockReturnValueOnce({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		const { rerender } = renderPanel();
		expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
		mocks.useStudentHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		rerender(
			<QueryClientProvider client={new QueryClient()}>
				<StudentHistoryPanel studentId="student-1" />
			</QueryClientProvider>,
		);
		expect(
			screen.getByText("Não foi possível carregar o histórico."),
		).toBeInTheDocument();
	});

	it("aplica filtros ao submeter", async () => {
		mocks.useClasses.mockReturnValue({ data: { data: [] } });
		mocks.useComponents.mockReturnValue({ data: { data: [] } });
		mocks.useStudentHistory.mockReturnValue({
			data: { estudante: { id: "student-1" }, eventos: [] },
			isLoading: false,
			isError: false,
		});
		renderPanel();
		fireEvent.change(screen.getByLabelText("Busca"), {
			target: { value: "rendimento" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
		await waitFor(() =>
			expect(mocks.useStudentHistory).toHaveBeenLastCalledWith("student-1", {
				q: "rendimento",
			}),
		);
	});

	it("aplica todos os filtros opcionais", async () => {
		const user = userEvent.setup();
		// Simula as páginas de turmas e componentes usadas pelos selects.
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const body = String(input).startsWith("/api/classes")
					? {
							data: [{ id: "class-1", name: "Turma A" }],
							total: 1,
						}
					: { data: [{ id: "component-1", name: "Matemática" }], total: 1 };
				return { ok: true, json: async () => body } as unknown as Response;
			}),
		);
		try {
			mocks.useClasses.mockReturnValue({ data: { data: [] } });
			mocks.useComponents.mockReturnValue({ data: { data: [] } });
			mocks.useStudentHistory.mockReturnValue({
				data: { estudante: { id: "student-1" }, eventos: [] },
				isLoading: false,
				isError: false,
			});
			renderPanel();
			fireEvent.change(screen.getByLabelText("Busca"), {
				target: { value: "desempenho" },
			});
			await user.click(screen.getByRole("combobox", { name: "Turma" }));
			await user.click(await screen.findByRole("option", { name: "Turma A" }));
			await user.click(screen.getByRole("combobox", { name: "Componente" }));
			await user.click(
				await screen.findByRole("option", { name: "Matemática" }),
			);
			fireEvent.change(screen.getByLabelText("Período"), {
				target: { value: "2026" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
		} finally {
			vi.unstubAllGlobals();
		}
		await waitFor(() =>
			expect(mocks.useStudentHistory).toHaveBeenLastCalledWith("student-1", {
				q: "desempenho",
				turmaId: "class-1",
				componenteId: "component-1",
				periodo: "2026",
			}),
		);
	});

	it("exibe estado vazio", () => {
		mocks.useClasses.mockReturnValue({ data: { data: [] } });
		mocks.useComponents.mockReturnValue({ data: { data: [] } });
		mocks.useStudentHistory.mockReturnValue({
			data: { estudante: { id: "student-1" }, eventos: [] },
			isLoading: false,
			isError: false,
		});
		renderPanel();
		expect(
			screen.getByText("Nenhum evento no histórico do estudante."),
		).toBeInTheDocument();
	});

	it("aplica formulário vazio sem filtros", async () => {
		mocks.useClasses.mockReturnValue({ data: { data: [] } });
		mocks.useComponents.mockReturnValue({ data: { data: [] } });
		mocks.useStudentHistory.mockReturnValue({
			data: { estudante: { id: "student-1" }, eventos: [] },
			isLoading: false,
			isError: false,
		});
		renderPanel();
		fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
		await waitFor(() =>
			expect(mocks.useStudentHistory).toHaveBeenLastCalledWith("student-1", {}),
		);
	});

	it("limpa os filtros ao clicar em Limpar", async () => {
		mocks.useClasses.mockReturnValue({ data: { data: [] } });
		mocks.useComponents.mockReturnValue({ data: { data: [] } });
		mocks.useStudentHistory.mockReturnValue({
			data: { estudante: { id: "student-1" }, eventos: [] },
			isLoading: false,
			isError: false,
		});
		renderPanel();
		fireEvent.change(screen.getByLabelText("Período"), {
			target: { value: "2026" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
		await waitFor(() =>
			expect(mocks.useStudentHistory).toHaveBeenLastCalledWith("student-1", {
				periodo: "2026",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
		await waitFor(() =>
			expect(mocks.useStudentHistory).toHaveBeenLastCalledWith("student-1", {}),
		);
	});
});
