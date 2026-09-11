import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassesPageResult, ClassListItem } from "#/lib/classes/types";

const mocks = vi.hoisted(() => ({
	useClasses: vi.fn(),
	useNavigate: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: mocks.useNavigate,
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

vi.mock("#/hooks/classes/use-classes", () => ({
	useClasses: mocks.useClasses,
}));

vi.mock("#/components/classes/create-class-dialog", () => ({
	CreateClassDialog: () => null,
}));

import ClassesPage from "./index";

function makeClass(overrides: Partial<ClassListItem> = {}): ClassListItem {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "class-1",
		name: "7º A",
		academicPeriod: "2026",
		course: null,
		grade: null,
		shift: null,
		createdAt: now,
		updatedAt: now,
		activeStudentCount: 3,
		...overrides,
	};
}

function makePage(
	overrides: Partial<ClassesPageResult> = {},
): ClassesPageResult {
	return {
		data: [makeClass()],
		total: 1,
		page: 1,
		pageSize: 10,
		academicPeriods: ["2025", "2026"],
		...overrides,
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<ClassesPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	mocks.useClasses.mockReturnValue({
		data: makePage(),
		isLoading: false,
		isError: false,
	});
	mocks.useNavigate.mockReturnValue(mocks.navigate);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("ClassesPage", () => {
	it("renderiza header só com título e ações, sem os links da tabela", () => {
		renderPage();

		expect(screen.getByRole("heading", { name: "Turmas" })).toBeInTheDocument();
		expect(screen.queryByText("Estrutura escolar")).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Organize turmas por período letivo/),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Matricular estudante" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Nova turma" }),
		).toBeInTheDocument();

		const table = screen.getByRole("table", { name: "Tabela de turmas" });
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Período letivo" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Estudantes ativos" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "7º A" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "2026" }),
		).toBeInTheDocument();
		expect(within(table).getByRole("cell", { name: "3" })).toBeInTheDocument();
		expect(
			within(table).queryByRole("link", { name: "Ver estudantes" }),
		).not.toBeInTheDocument();
		expect(
			within(table).queryByRole("link", { name: "Ofertas" }),
		).not.toBeInTheDocument();
	});

	it("exibe estado vazio quando não há turmas", () => {
		mocks.useClasses.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhuma turma encontrada")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		mocks.useClasses.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar os dados",
		);
	});

	it("troca de página chamando o hook com a nova página", () => {
		mocks.useClasses.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "2" }));

		expect(mocks.useClasses).toHaveBeenLastCalledWith({
			search: undefined,
			academicPeriod: undefined,
			page: 2,
			pageSize: 10,
		});
	});

	it("debounceia a busca e volta para a página 1", () => {
		mocks.useClasses.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useClasses.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		const search = screen.getByLabelText("Buscar por nome");
		fireEvent.change(search, { target: { value: "8º" } });

		expect(mocks.useClasses).toHaveBeenLastCalledWith({
			search: undefined,
			academicPeriod: undefined,
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useClasses).toHaveBeenLastCalledWith({
			search: "8º",
			academicPeriod: undefined,
			page: 1,
			pageSize: 10,
		});
	});

	it("filtra por período letivo e volta para a página 1", () => {
		mocks.useClasses.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useClasses.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		fireEvent.click(
			screen.getByRole("combobox", { name: "Filtrar por período letivo" }),
		);
		fireEvent.click(screen.getByRole("option", { name: "2025" }));

		expect(mocks.useClasses).toHaveBeenLastCalledWith({
			search: undefined,
			academicPeriod: "2025",
			page: 1,
			pageSize: 10,
		});
	});

	it("navega para os estudantes da turma ao clicar em célula de texto da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de turmas" });
		fireEvent.click(within(table).getByRole("cell", { name: "7º A" }));

		expect(mocks.navigate).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/classes/$id/students",
			params: { id: "class-1" },
		});
	});
});
