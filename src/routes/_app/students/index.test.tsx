import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Student } from "#/lib/students/schema";
import type { StudentsPageResult } from "#/lib/students/types";

const mocks = vi.hoisted(() => ({
	useStudents: vi.fn(),
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

vi.mock("#/components/students/create-student-dialog", () => ({
	CreateStudentDialog: () => null,
}));

import { StudentsPage } from "./index";

function makeStudent(overrides: Partial<Student> = {}): Student {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "student-1",
		name: "João Silva",
		document: "123",
		registrationNumber: null,
		email: null,
		phone: null,
		birthDate: null,
		notes: null,
		createdAt: now,
		updatedAt: now,
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
	mocks.useNavigate.mockReturnValue(mocks.navigate);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("StudentsPage", () => {
	it("renderiza a tabela com nome linkado e documento", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de estudantes" });
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Documento" }),
		).toBeInTheDocument();
		const link = within(table).getByRole("link", { name: "João Silva" });
		expect(link).toHaveAttribute("href", "/students/$id");
		expect(
			within(table).getByRole("cell", { name: "123" }),
		).toBeInTheDocument();
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

		expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
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
			page: 2,
			pageSize: 10,
		});
	});

	it("mostra botão para limpar a busca", () => {
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
			screen.getByText("Nenhum estudante corresponde à busca"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
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
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useStudents).toHaveBeenLastCalledWith({
			search: "Maria",
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
});
