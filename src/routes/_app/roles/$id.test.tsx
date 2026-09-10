import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "#/lib/roles/schema";

const mocks = vi.hoisted(() => ({
	useRole: vi.fn(),
	mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ id: "role-1" }),
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

vi.mock("#/hooks/roles/use-role", () => ({
	useRole: mocks.useRole,
}));

vi.mock("#/hooks/roles/use-update-role", () => ({
	useUpdateRole: () => ({ mutateAsync: mocks.mutateAsync }),
}));

import { RoleDetailPage } from "./$id";

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

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<RoleDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue(makeRole());
	mocks.useRole.mockReturnValue({
		data: makeRole(),
		isLoading: false,
		isError: false,
		error: null,
	});
});

describe("RoleDetailPage", () => {
	it("exibe carregando enquanto a query está pendente", () => {
		mocks.useRole.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});
		renderPage();

		expect(screen.getByText("Carregando...")).toBeInTheDocument();
	});

	it("exibe mensagem de erro quando o papel não é encontrado (404)", () => {
		mocks.useRole.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Falha ao carregar papel"),
		});
		renderPage();

		expect(screen.getByText("Falha ao carregar papel")).toBeInTheDocument();
	});

	it("preenche o formulário com os dados do papel", () => {
		renderPage();

		expect(screen.getByLabelText("Nome *")).toHaveValue("Professor");
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeInTheDocument();
	});

	it("submete a atualização e exibe confirmação", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.clear(screen.getByLabelText("Nome *"));
		await user.type(screen.getByLabelText("Nome *"), "Diretor");
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({ name: "Diretor" });
		expect(await screen.findByText("Papel atualizado")).toBeInTheDocument();
	});

	it("exibe erro do servidor quando a atualização falha", async () => {
		mocks.mutateAsync.mockRejectedValue(new Error("Papel não encontrado"));
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(await screen.findByText("Papel não encontrado")).toBeInTheDocument();
		expect(screen.queryByText("Papel atualizado")).not.toBeInTheDocument();
	});
});
