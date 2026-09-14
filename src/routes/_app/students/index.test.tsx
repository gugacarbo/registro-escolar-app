import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
	StudentsPageResult,
	StudentWithTurmas,
} from "#/lib/students/types";

const mocks = vi.hoisted(() => ({
	useStudents: vi.fn(),
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

vi.mock("#/hooks/students/use-students", () => ({
	useStudents: mocks.useStudents,
}));

vi.mock("#/hooks/classes/use-classes", () => ({
	useClasses: mocks.useClasses,
}));

vi.mock("#/components/students/create-student-dialog", () => ({
	CreateStudentDialog: () => null,
}));

import StudentsPage from "./index";

function makeStudent(
	overrides: Partial<StudentWithTurmas> = {},
): StudentWithTurmas {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "student-1",
		name: "João Silva",
		reference: "REF-2026-001",
		document: "123",
		registrationNumber: null,
		email: null,
		phone: null,
		birthDate: null,
		notes: null,
		createdAt: now,
		updatedAt: now,
		turmas: [],
		...overrides,
	};
}

function makePage(
	overrides: Partial<StudentsPageResult> = {},
): StudentsPageResult {
	return {
		data: [makeStudent()],
		total: 1,
		page: 1,
		pageSize: 10,
		...overrides,
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<StudentsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	mocks.useStudents.mockReturnValue({
		data: makePage(),
		isLoading: false,
		isError: false,
	});
	mocks.useClasses.mockReturnValue({
		data: { data: [], total: 0 },
		isLoading: false,
	});
	mocks.useNavigate.mockReturnValue(mocks.navigate);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("StudentsPage", () => {
	it("renderiza a tabela com nome linkado, referência e documento", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Documento" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Referência" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Turmas" }),
		).toBeInTheDocument();
		const link = within(table).getByRole("link", { name: "João Silva" });
		expect(link).toHaveAttribute("href", "/students/$id");
		expect(
			within(table).getByRole("cell", { name: "123" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "REF-2026-001" }),
		).toBeInTheDocument();
	});

	it("exibe as turmas ativas do estudante como badges", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({
				data: [
					makeStudent({
						turmas: [
							{ id: "class-1", name: "Turma A" },
							{ id: "class-2", name: "Turma B" },
						],
					}),
				],
			}),
			isLoading: false,
			isError: false,
		});
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		expect(within(table).getByText("Turma A")).toBeInTheDocument();
		expect(within(table).getByText("Turma B")).toBeInTheDocument();
	});

	it("exibe — quando o estudante não tem turma", () => {
		renderPage();
		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		expect(table).toBeInTheDocument();
		expect(
			within(table).getAllByRole("cell", { name: "—" }).length,
		).toBeGreaterThanOrEqual(1);
	});

	it("oculta o documento no mobile sem ocultar a ação de detalhes", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		expect(
			within(table).getByRole("columnheader", { name: "Documento" }),
		).toHaveClass("hidden", "sm:table-cell");
		expect(within(table).getByRole("cell", { name: "123" })).toHaveClass(
			"hidden",
			"sm:table-cell",
		);
		expect(
			within(table)
				.getByRole("link", { name: "Ver detalhes de João Silva" })
				.closest("td"),
		).not.toHaveClass("hidden");
	});

	it("exibe — quando o documento é nulo e o contador da página", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({
				data: [makeStudent({ document: null })],
				total: 25,
			}),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getAllByRole("cell", { name: "—" })).toHaveLength(2);
		expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();
	});

	it("exibe estado vazio quando não há estudantes", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhum estudante encontrado")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		mocks.useStudents.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar os dados",
		);
	});

	it("chama o refetch ao clicar em tentar novamente", () => {
		const refetch = vi.fn();
		mocks.useStudents.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch,
		});
		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it("muda o tamanho da página e volta para a página 1", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useStudents.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		fireEvent.click(screen.getByRole("combobox", { name: "Itens por página" }));
		fireEvent.click(screen.getByRole("option", { name: "20 / página" }));

		expect(mocks.useStudents).toHaveBeenLastCalledWith({
			search: undefined,
			classId: undefined,
			page: 1,
			pageSize: 20,
		});
	});

	it("exibe a mensagem de matrícula ativa quando o filtro é por turma", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		mocks.useClasses.mockReturnValue({
			data: {
				data: [
					{
						id: "class-1",
						name: "Turma A",
						academicPeriod: "2026.1",
						course: null,
						grade: null,
						shift: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						updatedAt: new Date("2026-01-01T00:00:00Z"),
					},
				],
				total: 1,
			},
			isLoading: false,
		});
		renderPage();

		fireEvent.click(
			screen.getByRole("combobox", { name: "Filtrar por turma" }),
		);
		fireEvent.click(screen.getByRole("option", { name: "Turma A" }));

		expect(
			screen.getByText("Nenhum estudante corresponde aos filtros"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Nenhum estudante com matrícula ativa nesta turma."),
		).toBeInTheDocument();
	});

	it("troca de página chamando o hook com a nova página", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "2" }));

		expect(mocks.useStudents).toHaveBeenLastCalledWith({
			search: undefined,
			classId: undefined,
			page: 2,
			pageSize: 10,
		});
	});

	it("mostra botão para limpar os filtros", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		const search = screen.getByLabelText("Buscar por nome ou documento");
		fireEvent.change(search, { target: { value: "Zé Ninguém" } });
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(
			screen.getByText("Nenhum estudante corresponde aos filtros"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
		expect(search).toHaveValue("");
	});

	it("debounceia a busca e volta para a página 1", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useStudents.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		const search = screen.getByLabelText("Buscar por nome ou documento");
		fireEvent.change(search, { target: { value: "Maria" } });

		expect(mocks.useStudents).toHaveBeenLastCalledWith({
			search: undefined,
			classId: undefined,
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useStudents).toHaveBeenLastCalledWith({
			search: "Maria",
			classId: undefined,
			page: 1,
			pageSize: 10,
		});
	});

	it("filtra por turma e volta para a página 1", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		mocks.useClasses.mockReturnValue({
			data: {
				data: [
					{
						id: "class-1",
						name: "Turma A",
						academicPeriod: "2026.1",
						course: null,
						grade: null,
						shift: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						updatedAt: new Date("2026-01-01T00:00:00Z"),
					},
				],
				total: 1,
			},
			isLoading: false,
		});
		renderPage();
		mocks.useStudents.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		fireEvent.click(
			screen.getByRole("combobox", { name: "Filtrar por turma" }),
		);
		fireEvent.click(screen.getByRole("option", { name: "Turma A" }));

		expect(mocks.useStudents).toHaveBeenLastCalledWith({
			search: undefined,
			classId: "class-1",
			page: 1,
			pageSize: 10,
		});
	});

	it("navega para o detalhe ao clicar em célula de texto da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		fireEvent.click(within(table).getByRole("cell", { name: "123" }));

		expect(mocks.navigate).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/students/$id",
			params: { id: "student-1" },
		});
	});

	it("clicar no link do nome não dispara a navegação da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		fireEvent.click(within(table).getByRole("link", { name: "João Silva" }));

		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("clicar no botão de ações não dispara a navegação da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		fireEvent.click(
			within(table).getByRole("link", {
				name: "Ver detalhes de João Silva",
			}),
		);

		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("gera iniciais para nomes com um ou nenhum token", () => {
		mocks.useStudents.mockReturnValue({
			data: makePage({
				data: [
					makeStudent({ id: "student-empty", name: "   " }),
					makeStudent({ id: "student-one", name: "Ana" }),
					makeStudent({ id: "student-multi", name: "Maria da Silva" }),
				],
				total: 3,
			}),
			isLoading: false,
			isError: false,
		});
		renderPage();
		expect(screen.getByText("MS")).toBeInTheDocument();
		expect(screen.getByText("A")).toBeInTheDocument();
		expect(screen.getByText("?")).toBeInTheDocument();
	});
});
