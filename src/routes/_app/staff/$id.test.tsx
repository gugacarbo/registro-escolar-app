import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffMember } from "#/lib/staff/schema";

const mocks = vi.hoisted(() => ({
	useStaffMember: vi.fn(),
	mutateAsync: vi.fn(),
	deleteAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ id: "staff-1" }),
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

vi.mock("#/hooks/staff/use-staff-member", () => ({
	useStaffMember: mocks.useStaffMember,
}));

vi.mock("#/hooks/staff/use-update-staff-member", () => ({
	useUpdateStaffMember: () => ({ mutateAsync: mocks.mutateAsync }),
}));
vi.mock("#/hooks/staff/use-delete-staff-member", () => ({
	useDeleteStaffMember: () => ({
		mutateAsync: mocks.deleteAsync,
		isPending: false,
	}),
}));

import { StaffDetailPage } from "./$id";

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

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<StaffDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue(makeMember());
	mocks.deleteAsync.mockReset();
	mocks.deleteAsync.mockResolvedValue(makeMember());
	mocks.useStaffMember.mockReturnValue({
		data: makeMember(),
		isLoading: false,
		isError: false,
		error: null,
	});
});

describe("StaffDetailPage", () => {
	it("exibe carregando enquanto a query está pendente", () => {
		mocks.useStaffMember.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});
		renderPage();

		expect(screen.getByText("Carregando...")).toBeInTheDocument();
	});

	it("exibe mensagem de erro quando o servidor não é encontrado (404)", () => {
		mocks.useStaffMember.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Falha ao carregar servidor"),
		});
		renderPage();

		expect(screen.getByText("Falha ao carregar servidor")).toBeInTheDocument();
	});

	it("preenche o formulário com os dados do servidor", () => {
		renderPage();

		expect(screen.getByLabelText("Nome *")).toHaveValue("João Silva");
		expect(screen.getByLabelText("Email")).toHaveValue("joao@example.com");
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeInTheDocument();
	});

	it("submete a atualização e exibe confirmação", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.clear(screen.getByLabelText("Nome *"));
		await user.type(screen.getByLabelText("Nome *"), "João Souza");
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			name: "João Souza",
			email: "joao@example.com",
			phone: null,
			notes: null,
		});
		expect(await screen.findByText("Servidor atualizado")).toBeInTheDocument();
	});

	it("exibe erro do servidor quando a atualização falha", async () => {
		mocks.mutateAsync.mockRejectedValue(new Error("Servidor não encontrado"));
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(
			await screen.findByText("Servidor não encontrado"),
		).toBeInTheDocument();
		expect(screen.queryByText("Servidor atualizado")).not.toBeInTheDocument();
	});
});

it("remove o servidor com confirmação", async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(screen.getByRole("button", { name: "Remover servidor" }));
	await user.click(screen.getByRole("button", { name: "Remover" }));

	expect(mocks.deleteAsync).toHaveBeenCalledTimes(1);
});
