import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Component } from "#/lib/components/schema";
import type { ComponentsPageResult } from "#/lib/components/types";

const mocks = vi.hoisted(() => ({
	useComponents: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
}));

vi.mock("#/hooks/components/use-components", () => ({
	useComponents: mocks.useComponents,
}));

vi.mock("#/components/components/create-component-dialog", () => ({
	CreateComponentDialog: () => null,
}));

import { ComponentsPage } from "./index";

function makeComponent(overrides: Partial<Component> = {}): Component {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "component-1",
		name: "Matemática",
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makePage(
	overrides: Partial<ComponentsPageResult> = {},
): ComponentsPageResult {
	return {
		data: [makeComponent()],
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
			<ComponentsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	mocks.useComponents.mockReturnValue({
		data: makePage(),
		isLoading: false,
		isError: false,
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("ComponentsPage", () => {
	it("renderiza a tabela com o nome do componente", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de componentes" });
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "Matemática" }),
		).toBeInTheDocument();
	});

	it("exibe estado vazio quando não há componentes", () => {
		mocks.useComponents.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(
			screen.getByText("Nenhum componente encontrado"),
		).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		mocks.useComponents.mockReturnValue({
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
		mocks.useComponents.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "2" }));

		expect(mocks.useComponents).toHaveBeenLastCalledWith({
			search: undefined,
			page: 2,
			pageSize: 10,
		});
	});

	it("debounceia a busca e volta para a página 1", () => {
		mocks.useComponents.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useComponents.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		const search = screen.getByLabelText("Buscar por nome");
		fireEvent.change(search, { target: { value: "Port" } });

		expect(mocks.useComponents).toHaveBeenLastCalledWith({
			search: undefined,
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useComponents).toHaveBeenLastCalledWith({
			search: "Port",
			page: 1,
			pageSize: 10,
		});
	});
});
