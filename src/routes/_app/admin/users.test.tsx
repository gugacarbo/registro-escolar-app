import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import type { AdminUser } from "#/lib/admin-users/schema";

const mocks = vi.hoisted(() => ({
	useAdminUsers: vi.fn(),
	useUpdateUserRole: vi.fn(),
	useDeleteUser: vi.fn(),
	useSession: vi.fn(),
	updateRoleMutate: vi.fn(),
	deleteUserMutate: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
}));

vi.mock("#/hooks/admin-users/use-admin-users", () => ({
	getAdminUsersQueryKey: vi.fn(() => ["admin", "users"]),
	useAdminUsers: mocks.useAdminUsers,
}));

vi.mock("#/hooks/admin-users/use-update-user-role", () => ({
	useUpdateUserRole: mocks.useUpdateUserRole,
}));

vi.mock("#/hooks/admin-users/use-delete-user", () => ({
	useDeleteUser: mocks.useDeleteUser,
}));

vi.mock("#/hooks/use-debounced-value", () => ({
	useDebouncedValue: (value: unknown) => value,
}));

vi.mock("#/lib/auth/session-context", () => ({
	useAuthSession: mocks.useSession,
}));

vi.mock("sonner", () => ({
	toast: {
		success: mocks.toastSuccess,
		error: mocks.toastError,
	},
}));

import AdminUsersPage from "./users";

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "user-1",
		name: "Maria Souza",
		email: "maria@example.com",
		emailVerified: true,
		image: null,
		role: "user",
		isPermanentAdmin: false,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makePage(users: AdminUser[] = [makeUser()]) {
	return {
		data: users,
		total: users.length,
		page: 1,
		pageSize: 10,
	};
}

function meSession(role: "admin" | "user" = "admin") {
	return {
		session: { id: "session-1", userId: "me-1" },
		user: {
			id: "me-1",
			name: "Eu Admin",
			email: "me@example.com",
			role,
			isPermanentAdmin: false,
		},
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<TooltipProvider>
				<AdminUsersPage />
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

describe("AdminUsersPage", () => {
	beforeEach(() => {
		mocks.useAdminUsers.mockReset();
		mocks.useUpdateUserRole.mockReset();
		mocks.useDeleteUser.mockReset();
		mocks.useSession.mockReset();
		mocks.updateRoleMutate.mockReset();
		mocks.deleteUserMutate.mockReset();
		mocks.toastSuccess.mockReset();
		mocks.toastError.mockReset();

		mocks.useSession.mockReturnValue(meSession());
		mocks.useAdminUsers.mockReturnValue({
			data: makePage(),
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});
		mocks.useUpdateUserRole.mockReturnValue({
			mutateAsync: mocks.updateRoleMutate,
			isPending: false,
		});
		mocks.useDeleteUser.mockReturnValue({
			mutateAsync: mocks.deleteUserMutate,
			isPending: false,
		});
	});

	it("renderiza contas com papel, data e badge de admin permanente", () => {
		const me = makeUser({
			id: "me-1",
			name: "Eu Admin",
			email: "me@example.com",
			role: "admin",
			isPermanentAdmin: true,
		});
		const other = makeUser({
			id: "user-3",
			name: "Maria Souza",
			email: "maria@example.com",
		});
		mocks.useAdminUsers.mockReturnValue({
			data: makePage([me, other]),
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});

		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de usuários" });
		expect(
			within(table).getByRole("cell", { name: "Maria Souza" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: /Admin.*permanente/ }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("cell", { name: "Usuário" }),
		).toBeInTheDocument();
	});

	it("exibe estado vazio quando não há contas", () => {
		mocks.useAdminUsers.mockReturnValue({
			data: makePage([]),
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});

		renderPage();

		expect(screen.getByText("Nenhum usuário encontrado")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro e opção de tentar novamente quando a query falha", () => {
		mocks.useAdminUsers.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: vi.fn(),
		});

		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar os dados",
		);
		expect(
			screen.getByRole("button", { name: "Tentar novamente" }),
		).toBeInTheDocument();
	});

	it("exibe skeleton durante o carregamento sem revelar os estados finais", () => {
		mocks.useAdminUsers.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			refetch: vi.fn(),
		});

		renderPage();

		expect(
			screen.queryByText("Nenhum usuário encontrado"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("cell", { name: "Maria Souza" }),
		).not.toBeInTheDocument();
	});

	describe("restrições das ações por conta", () => {
		function renderProtectedPage() {
			const me = makeUser({
				id: "me-1",
				name: "Eu Admin",
				email: "me@example.com",
				role: "admin",
			});
			const permanent = makeUser({
				id: "perm-1",
				name: "Admin Permanente",
				email: "perm@example.com",
				role: "admin",
				isPermanentAdmin: true,
			});
			const otherAdmin = makeUser({
				id: "admin-2",
				name: "Outro Admin",
				email: "admin2@example.com",
				role: "admin",
			});
			const regular = makeUser({
				id: "user-3",
				name: "Maria Souza",
				email: "maria@example.com",
			});
			mocks.useAdminUsers.mockReturnValue({
				data: makePage([me, permanent, otherAdmin, regular]),
				isLoading: false,
				isError: false,
				refetch: vi.fn(),
			});
			renderPage();
		}

		it("desabilita ações da própria conta", () => {
			renderProtectedPage();

			const row = screen.getByRole("row", { name: /me@example.com/ });
			expect(
				within(row).getByRole("button", { name: "Tornar user Eu Admin" }),
			).toBeDisabled();
			expect(
				within(row).getByRole("button", { name: "Excluir Eu Admin" }),
			).toBeDisabled();
		});

		it("desabilita ações do administrador permanente", () => {
			renderProtectedPage();

			const row = screen.getByRole("row", { name: /perm@example.com/ });
			expect(
				within(row).getByRole("button", {
					name: "Tornar user Admin Permanente",
				}),
			).toBeDisabled();
			expect(
				within(row).getByRole("button", { name: "Excluir Admin Permanente" }),
			).toBeDisabled();
		});

		it("permite rebaixar outra conta admin, mas mantém exclusão desabilitada", () => {
			renderProtectedPage();

			const row = screen.getByRole("row", { name: /admin2@example.com/ });
			expect(
				within(row).getByRole("button", { name: "Tornar user Outro Admin" }),
			).toBeEnabled();
			expect(
				within(row).getByRole("button", { name: "Excluir Outro Admin" }),
			).toBeDisabled();
		});

		it("mantém ações habilitadas para user comum", () => {
			renderProtectedPage();

			const row = screen.getByRole("row", { name: /maria@example.com/ });
			expect(
				within(row).getByRole("button", { name: "Tornar admin Maria Souza" }),
			).toBeEnabled();
			expect(
				within(row).getByRole("button", { name: "Excluir Maria Souza" }),
			).toBeEnabled();
		});
	});

	it("promove user comum a admin e confirma com toast", async () => {
		mocks.updateRoleMutate.mockResolvedValueOnce(makeUser({ role: "admin" }));

		renderPage();

		const user = userEvent.setup();
		await user.click(
			screen.getByRole("button", { name: "Tornar admin Maria Souza" }),
		);

		await waitFor(() =>
			expect(mocks.updateRoleMutate).toHaveBeenCalledWith({ role: "admin" }),
		);
		expect(mocks.toastSuccess).toHaveBeenCalledWith(
			"Usuário promovido a admin",
		);
	});

	it("rebaixa admin para user e confirma com toast", async () => {
		mocks.useAdminUsers.mockReturnValue({
			data: makePage([
				makeUser({
					id: "admin-2",
					name: "Outro Admin",
					email: "admin2@example.com",
					role: "admin",
				}),
			]),
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		});
		mocks.updateRoleMutate.mockResolvedValueOnce(makeUser({ role: "user" }));

		renderPage();

		const user = userEvent.setup();
		await user.click(
			screen.getByRole("button", { name: "Tornar user Outro Admin" }),
		);

		await waitFor(() =>
			expect(mocks.updateRoleMutate).toHaveBeenCalledWith({ role: "user" }),
		);
		expect(mocks.toastSuccess).toHaveBeenCalledWith(
			"Usuário rebaixado para user",
		);
	});

	it("exibe a mensagem do servidor quando a promoção falha", async () => {
		mocks.updateRoleMutate.mockRejectedValueOnce(
			new Error("O administrador permanente não pode ser alterado"),
		);

		renderPage();

		const user = userEvent.setup();
		await user.click(
			screen.getByRole("button", { name: "Tornar admin Maria Souza" }),
		);

		await waitFor(() =>
			expect(mocks.toastError).toHaveBeenCalledWith(
				"O administrador permanente não pode ser alterado",
			),
		);
	});

	it("exclui user comum após a confirmação e confirma com toast", async () => {
		mocks.deleteUserMutate.mockResolvedValueOnce(makeUser());

		renderPage();

		const user = userEvent.setup();
		await user.click(
			screen.getByRole("button", { name: "Excluir Maria Souza" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		expect(within(dialog).getByText("Excluir usuário?")).toBeInTheDocument();
		await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

		await waitFor(() =>
			expect(mocks.deleteUserMutate).toHaveBeenCalledTimes(1),
		);
		expect(mocks.toastSuccess).toHaveBeenCalledWith("Usuário excluído");
	});

	it("cancelar a confirmação não dispara a exclusão", async () => {
		renderPage();

		const user = userEvent.setup();
		await user.click(
			screen.getByRole("button", { name: "Excluir Maria Souza" }),
		);
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);

		expect(mocks.deleteUserMutate).not.toHaveBeenCalled();
	});
});
