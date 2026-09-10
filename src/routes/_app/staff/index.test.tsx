import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffMember } from "#/lib/staff/schema";
import type { StaffPageResult } from "#/lib/staff/types";

const mocks = vi.hoisted(() => ({
	useStaff: vi.fn(),
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

vi.mock("#/hooks/staff/use-staff", () => ({
	useStaff: mocks.useStaff,
}));

import StaffPage from "./index";

function makeMember(overrides: Partial<StaffMember> = {}): StaffMember {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "staff-1",
		name: "João Silva",
		email: "joao@example.com",
		phone: null,
		notes: null,
		deletedAt: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makePage(overrides: Partial<StaffPageResult> = {}): StaffPageResult {
	return {
		data: [makeMember()],
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
			<StaffPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	mocks.useStaff.mockReturnValue({
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

describe("StaffPage", () => {
	it("renderiza a tabela com nome e email", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de servidores" });
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Email" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "João Silva" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "joao@example.com" }),
		).toBeInTheDocument();
	});

	it("exibe — quando o email é nulo", () => {
		mocks.useStaff.mockReturnValue({
			data: makePage({ data: [makeMember({ email: null })], total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
		expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();
	});

	it("exibe estado vazio quando não há servidores", () => {
		mocks.useStaff.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhum servidor encontrado")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		mocks.useStaff.mockReturnValue({
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
		mocks.useStaff.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "2" }));

		expect(mocks.useStaff).toHaveBeenLastCalledWith({
			search: undefined,
			page: 2,
			pageSize: 10,
		});
	});

	it("debounceia a busca e volta para a página 1", () => {
		mocks.useStaff.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useStaff.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		const search = screen.getByLabelText("Buscar por nome ou email");
		fireEvent.change(search, { target: { value: "Maria" } });

		expect(mocks.useStaff).toHaveBeenLastCalledWith({
			search: undefined,
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useStaff).toHaveBeenLastCalledWith({
			search: "Maria",
			page: 1,
			pageSize: 10,
		});
	});

	it("navega para o detalhe ao clicar em célula de texto da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de servidores" });
		fireEvent.click(within(table).getByRole("cell", { name: "João Silva" }));

		expect(mocks.navigate).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/staff/$id",
			params: { id: "staff-1" },
		});
	});

	it("clicar no link do cabeçalho não dispara a navegação da linha", () => {
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "Novo servidor" }));

		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
