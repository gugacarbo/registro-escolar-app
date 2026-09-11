import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useClassHistory: vi.fn(),
	useOffers: vi.fn(),
}));

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

vi.mock("#/hooks/entity-fetchers", () => ({
	fetchClassesPage: async () => ({ data: [], total: 0 }),
	fetchComponentsPage: async () => ({
		data: [{ id: "comp-1", name: "Matemática" }],
		total: 1,
	}),
}));

vi.mock("#/hooks/history/use-history", () => ({
	useClassHistory: mocks.useClassHistory,
}));

vi.mock("#/hooks/offers/use-offers", () => ({
	useOffers: mocks.useOffers,
}));

vi.mock("#/components/offers/class-offers-panel", () => ({
	ClassOffersPanel: ({ classId }: { classId: string; turmaName?: string }) => (
		<div>ofertas da turma {classId}</div>
	),
}));

import type { ClassHistoryResult } from "#/lib/history/types";
import ClassStudentsPage from "./students";

function makeHistory(
	overrides: Partial<ClassHistoryResult> = {},
): ClassHistoryResult {
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
	mocks.useOffers.mockReturnValue({ data: [], isLoading: false });
});

describe("ClassStudentsPage", () => {
	it("renderiza dados da turma, cartões e aba de estudantes", () => {
		renderPage();

		expect(
			screen.getByRole("heading", { name: "Turma A" }),
		).toBeInTheDocument();
		expect(
			within(
				screen
					.getByText("Estudantes vinculados")
					.closest("[data-slot=card]") as HTMLElement,
			).getByText("2"),
		).toBeInTheDocument();
		expect(
			within(
				screen.getByText("Ofertas").closest("[data-slot=card]") as HTMLElement,
			).getByText("0"),
		).toBeInTheDocument();
		expect(screen.getByText("Turma A")).toBeInTheDocument();
		expect(
			screen.getByText((content) => content?.includes("Período letivo")),
		).toBeInTheDocument();
		expect(screen.getByText("Ativa")).toBeInTheDocument();
		expect(screen.getByText("Transferida")).toBeInTheDocument();
		expect(
			screen.getByText("Início 01/01/2026 · Em andamento"),
		).toBeInTheDocument();
	});

	it("coloca vínculos ativos antes dos encerrados", () => {
		renderPage();
		const list = screen.getByRole("list", { name: "Estudantes vinculados" });
		const items = within(list).getAllByRole("listitem");
		expect(items[0] ?? "").toHaveTextContent("João");
		expect(items[1] ?? "").toHaveTextContent("Maria");
	});

	it("abre a aba de reuniões com data e status", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(screen.getByRole("tab", { name: "Reuniões (1)" }));

		expect(
			screen.getByText("Realizada em 10/05/2026, 18:00"),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Conselho 2026" })).toHaveAttribute(
			"href",
			"/meetings/$meetingId",
		);
		expect(screen.getByText("Finalizada")).toBeInTheDocument();
	});

	it("abre a aba de ofertas do painel de configurações", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(screen.getByRole("tab", { name: "Ofertas (0)" }));

		expect(screen.getByText("ofertas da turma class-1")).toBeInTheDocument();
	});

	it("abre a aba de linha do tempo e oculta o nome da turma redundante", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(screen.getByRole("tab", { name: "Linha do tempo (1)" }));

		expect(screen.getByText("Registro")).toBeInTheDocument();
		expect(screen.getByText("Baixo rendimento")).toBeInTheDocument();
		expect(screen.getByText("Reunião: Conselho 2026")).toBeInTheDocument();
		expect(screen.queryByText("Turma: Turma A")).not.toBeInTheDocument();
	});

	it("exibe estados vazios nas abas de estudantes, reuniões e eventos", async () => {
		const user = userEvent.setup();
		mocks.useClassHistory.mockReturnValue({
			data: makeHistory({ estudantes: [], reunioes: [], eventos: [] }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhum estudante vinculado")).toBeInTheDocument();
		await user.click(screen.getByRole("tab", { name: "Reuniões (0)" }));
		expect(
			screen.getByText("Nenhuma reunião vinculada a esta turma."),
		).toBeInTheDocument();
		await user.click(screen.getByRole("tab", { name: "Linha do tempo (0)" }));
		expect(
			screen.getByText("Nenhum evento no histórico da turma."),
		).toBeInTheDocument();
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
		const user = userEvent.setup();
		const result = renderPage();
		try {
			await user.click(screen.getByRole("tab", { name: "Linha do tempo (1)" }));
			await user.type(screen.getByLabelText("Busca"), "conselho");
			await user.click(screen.getByRole("combobox", { name: "Componente" }));
			const option = await screen.findByRole("option", {
				name: "Matemática",
			});
			await user.click(option);
			await user.type(screen.getByLabelText("Período"), "2026");
			await user.click(screen.getByRole("button", { name: "Filtrar" }));
			expect(mocks.useClassHistory).toHaveBeenLastCalledWith("class-1", {
				q: "conselho",
				componenteId: "comp-1",
				periodo: "2026",
			});

			await user.click(screen.getByRole("button", { name: "Limpar" }));
			expect(mocks.useClassHistory).toHaveBeenLastCalledWith("class-1", {});
		} finally {
			result.unmount();
		}
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
