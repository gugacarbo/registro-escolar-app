import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "#/lib/roles/schema";
import type { RolesPageResult } from "#/lib/roles/types";

const mocks = vi.hoisted(() => ({
	useRoles: vi.fn(),
	useNavigate: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: mocks.useNavigate,
}));

vi.mock("#/hooks/roles/use-roles", () => ({
	useRoles: mocks.useRoles,
}));

vi.mock("#/components/roles/create-role-dialog", () => ({
	CreateRoleDialog: () => null,
}));

import RolesPage from "./index";

function makeRole(overrides: Partial<Role> = {}): Role {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "role-1",
		name: "Professor",
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makePage(overrides: Partial<RolesPageResult> = {}): RolesPageResult {
	return {
		data: [makeRole()],
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
			<RolesPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	mocks.useRoles.mockReturnValue({
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

describe("RolesPage", () => {
	it("renderiza a tabela com o nome do papel", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de papéis" });
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "Professor" }),
		).toBeInTheDocument();
	});

	it("exibe estado vazio quando não há papéis", () => {
		mocks.useRoles.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhum papel encontrado")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		mocks.useRoles.mockReturnValue({
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
		mocks.useRoles.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "2" }));

		expect(mocks.useRoles).toHaveBeenLastCalledWith({
			search: undefined,
			page: 2,
			pageSize: 10,
		});
	});

	it("debounceia a busca e volta para a página 1", () => {
		mocks.useRoles.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useRoles.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		const search = screen.getByLabelText("Buscar por nome");
		fireEvent.change(search, { target: { value: "Dir" } });

		expect(mocks.useRoles).toHaveBeenLastCalledWith({
			search: undefined,
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useRoles).toHaveBeenLastCalledWith({
			search: "Dir",
			page: 1,
			pageSize: 10,
		});
	});

	it("navega para o detalhe ao clicar em célula de texto da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de papéis" });
		fireEvent.click(within(table).getByRole("cell", { name: "Professor" }));

		expect(mocks.navigate).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/roles/$id",
			params: { id: "role-1" },
		});
	});

	it("clicar no botão Novo papel não dispara a navegação da linha", () => {
		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "Novo papel" }));

		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
