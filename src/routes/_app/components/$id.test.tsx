import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Component } from "#/lib/components/schema";

const mocks = vi.hoisted(() => ({
	useComponent: vi.fn(),
	mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ id: "component-1" }),
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

vi.mock("#/hooks/components/use-component", () => ({
	useComponent: mocks.useComponent,
}));

vi.mock("#/hooks/components/use-update-component", () => ({
	useUpdateComponent: () => ({ mutateAsync: mocks.mutateAsync }),
}));

import ComponentDetailPage from "./$id";

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

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<ComponentDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue(makeComponent());
	mocks.useComponent.mockReturnValue({
		data: makeComponent(),
		isLoading: false,
		isError: false,
		error: null,
	});
});

describe("ComponentDetailPage", () => {
	it("exibe carregando enquanto a query está pendente", () => {
		mocks.useComponent.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});
		renderPage();

		expect(screen.getByText("Carregando...")).toBeInTheDocument();
	});

	it("exibe mensagem de erro quando o componente não é encontrado (404)", () => {
		mocks.useComponent.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Falha ao carregar componente"),
		});
		renderPage();

		expect(
			screen.getByText("Falha ao carregar componente"),
		).toBeInTheDocument();
	});

	it("preenche o formulário com os dados do componente", () => {
		renderPage();

		expect(screen.getByLabelText("Nome *")).toHaveValue("Matemática");
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeInTheDocument();
	});

	it("submete a atualização e exibe confirmação", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.clear(screen.getByLabelText("Nome *"));
		await user.type(screen.getByLabelText("Nome *"), "Física");
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({ name: "Física" });
		expect(
			await screen.findByText("Componente atualizado"),
		).toBeInTheDocument();
	});

	it("exibe erro do servidor quando a atualização falha", async () => {
		mocks.mutateAsync.mockRejectedValue(new Error("Componente não encontrado"));
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(
			await screen.findByText("Componente não encontrado"),
		).toBeInTheDocument();
		expect(screen.queryByText("Componente atualizado")).not.toBeInTheDocument();
	});
});
