import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useClassHistory: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ id: "class-1" }),
	}),
	Link: ({
		children,
		to,
		...rest
	}: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("#/hooks/history/use-history", () => ({
	useClassHistory: mocks.useClassHistory,
}));

import type { ClassHistoryResult } from "#/lib/history/types";
import ClassStudentsPage from "./students";

function makeHistory(overrides: Partial<ClassHistoryResult> = {}): ClassHistoryResult {
	return {
		turma: {
			id: "class-1",
			name: "Turma A",
			academicPeriod: "2026",
			course: null,
			grade: "9º",
			shift: "Manhã",
		},
		estudantes: [
			{
				studentId: "student-1",
				name: "João",
				status: "ativa",
				startDate: "2026-01-01T00:00:00.000Z",
				endDate: null,
			},
			{
				studentId: "student-2",
				name: "Maria",
				status: "transferida",
				startDate: "2025-01-01T00:00:00.000Z",
				endDate: "2026-06-01T00:00:00.000Z",
			},
		],
		reunioes: [
			{
				id: "meeting-1",
				title: "Conselho 2026",
				status: "finished",
				heldAt: "2026-05-10T21:00:00.000Z",
			},
		],
		eventos: [
			{
				id: "ev-1",
				tipo: "registro",
				data: "2026-05-10T21:00:00.000Z",
				studentId: "student-1",
				studentName: "João",
				turmaId: "class-1",
				turmaNome: "Turma A",
				reuniaoId: "meeting-1",
				reuniaoTitulo: "Conselho 2026",
				reuniaoStatus: "finished",
				texto: "Baixo rendimento",
				categoriaId: null,
				componenteId: null,
				includeInMinutes: null,
				interno: false,
				metadata: {},
			},
		],
		...overrides,
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<ClassStudentsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useClassHistory.mockImplementation(() => ({
		data: makeHistory(),
		isLoading: false,
		isError: false,
	}));
});

describe("ClassStudentsPage", () => {
	it("renderiza dados da turma, cartões e listas", () => {
		renderPage();

		expect(
			screen.getByRole("heading", { name: "Estudantes da turma" }),
		).toBeInTheDocument();
		expect(
			within(
				screen.getByText("Estudantes vinculados").closest("[data-slot=card]") as HTMLElement,
			).getByText("2"),
		).toBeInTheDocument();
		expect(screen.getByText("Turma A")).toBeInTheDocument();
		expect(screen.getByText("Período letivo 2026")).toBeInTheDocument();
		expect(screen.getByText("Ativa")).toBeInTheDocument();
		expect(screen.getByText("Transferida")).toBeInTheDocument();
		expect(screen.getByText("Início 01/01/2026 · Em andamento")).toBeInTheDocument();
		expect(screen.getByText("Realizada em 10/05/2026, 18:00")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Conselho 2026" }),
		).toHaveAttribute("href", "/meetings/meeting-1");
		expect(screen.getByText("Finalizada")).toBeInTheDocument();
		expect(screen.getByText("Registro")).toBeInTheDocument();
		expect(screen.getByText("Baixo rendimento")).toBeInTheDocument();
		expect(screen.getByText("Reunião: Conselho 2026")).toBeInTheDocument();
		expect(screen.queryByText("Turma: Turma A")).not.toBeInTheDocument();
	});

	it("coloca vínculos ativos antes dos encerrados", () => {
		renderPage();
		const items = screen.getAllByRole("listitem").slice(0, 2);
		expect(items[0] ?? "").toHaveTextContent("João");
		expect(items[1] ?? "").toHaveTextContent("Maria");
	});

	it("exibe estado vazio sem estudantes, reuniões e eventos", () => {
		mocks.useClassHistory.mockReturnValue({
			data: makeHistory({ estudantes: [], reunioes: [], eventos: [] }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhum estudante vinculado")).toBeInTheDocument();
		expect(
			screen.getByText("Nenhuma reunião vinculada a esta turma."),
		).toBeInTheDocument();
		expect(screen.getByText("Nenhum evento no histórico da turma.")).toBeInTheDocument();
	});

	it("exibe erro de carregamento", () => {
		mocks.useClassHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível carregar os dados da turma.",
		);
	});

	it("envia filtros para a linha do tempo e limpa ao clicar em Limpar", async () => {
		mocks.useClassHistory.mockImplementation(() => ({
			data: makeHistory(),
			isLoading: false,
			isError: false,
		}));
		const user = userEvent.setup();
		renderPage();

		await user.type(screen.getByLabelText("Busca"), "conselho");
		await user.type(screen.getByLabelText("Componente"), "comp-1");
		await user.type(screen.getByLabelText("Período"), "2026");
		await user.click(screen.getByRole("button", { name: "Filtrar" }));
		expect(mocks.useClassHistory).toHaveBeenLastCalledWith("class-1", {
			q: "conselho",
			componenteId: "comp-1",
			periodo: "2026",
		});

		await user.click(screen.getByRole("button", { name: "Limpar" }));
		expect(mocks.useClassHistory).toHaveBeenLastCalledWith("class-1", {});
	});

	it("exibe skeleton durante o carregamento", () => {
		mocks.useClassHistory.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		renderPage();
		expect(document.querySelector("[data-slot=skeleton]")).toBeInTheDocument();
	});
});
