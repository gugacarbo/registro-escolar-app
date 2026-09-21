import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	pathname: "/",
	useSession: vi.fn(),
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: {
		useSession: mocks.useSession,
	},
}));

vi.mock("#/lib/auth/session-context", () => ({
	useAuthSession: () => mocks.useSession()?.data ?? null,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...rest
	}: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
	useLocation: (opts?: { select?: (s: { pathname: string }) => string }) =>
		opts?.select ? opts.select({ pathname: mocks.pathname }) : mocks.pathname,
}));

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

import { SidebarProvider } from "#/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";

function renderSidebar(pathname = "/", session: unknown = null) {
	mocks.pathname = pathname;
	mocks.useSession.mockReturnValue({ data: session, isPending: false });
	return render(
		<SidebarProvider>
			<AppSidebar />
		</SidebarProvider>,
	);
}

function adminSession() {
	return {
		session: { id: "session-1", userId: "admin-1" },
		user: { id: "admin-1", name: "Admin", email: "admin@e.com", role: "admin" },
	};
}

function userSession() {
	return {
		session: { id: "session-1", userId: "user-1" },
		user: { id: "user-1", name: "Comum", email: "comum@e.com", role: "user" },
	};
}

describe("AppSidebar", () => {
	beforeEach(() => {
		mocks.pathname = "/";
		mocks.useSession.mockReset();
		mocks.useSession.mockReturnValue({ data: null, isPending: false });
	});

	it("exibe os botões de navegação apontando para as listas", () => {
		renderSidebar("/");

		expect(screen.getByRole("link", { name: "Estudantes" })).toHaveAttribute(
			"href",
			"/students",
		);
		expect(screen.getByRole("link", { name: "Turmas" })).toHaveAttribute(
			"href",
			"/classes",
		);
		expect(screen.getByRole("link", { name: "Servidores" })).toHaveAttribute(
			"href",
			"/staff",
		);
		expect(screen.getByRole("link", { name: "Cargos" })).toHaveAttribute(
			"href",
			"/roles",
		);
		expect(screen.getByRole("link", { name: "Componentes" })).toHaveAttribute(
			"href",
			"/components",
		);
		expect(screen.getByRole("link", { name: "Reuniões" })).toHaveAttribute(
			"href",
			"/meetings",
		);
		expect(screen.getByRole("link", { name: "Atas" })).toHaveAttribute(
			"href",
			"/minutes",
		);
		expect(
			screen.getByRole("link", { name: "Modelos de Ata" }),
		).toHaveAttribute("href", "/minutes/templates");
		expect(screen.getAllByRole("link")).toHaveLength(9);
	});

	it("exibe Usuários apenas para sessão admin", () => {
		renderSidebar("/", adminSession());

		expect(screen.getByRole("link", { name: "Usuários" })).toHaveAttribute(
			"href",
			"/admin/users",
		);
		expect(screen.getAllByRole("link")).toHaveLength(10);
	});

	it("oculta Usuários para sessão de user comum", () => {
		renderSidebar("/", userSession());

		expect(
			screen.queryByRole("link", { name: "Usuários" }),
		).not.toBeInTheDocument();
		expect(screen.getAllByRole("link")).toHaveLength(9);
	});

	it("marca Estudantes como ativo na lista e nas subrotas", () => {
		const { unmount } = renderSidebar("/students/");
		expect(screen.getByRole("link", { name: "Estudantes" })).toHaveAttribute(
			"data-active",
			"true",
		);
		unmount();

		renderSidebar("/students/import");
		expect(screen.getByRole("link", { name: "Estudantes" })).toHaveAttribute(
			"data-active",
			"true",
		);
	});

	it("não marca Estudantes como ativo fora da lista", () => {
		renderSidebar("/");

		expect(screen.getByRole("link", { name: "Estudantes" })).toHaveAttribute(
			"data-active",
			"false",
		);
	});

	it("marca apenas Modelos de Ata como ativo na página de templates", () => {
		renderSidebar("/minutes/templates");

		expect(
			screen.getByRole("link", { name: "Modelos de Ata" }),
		).toHaveAttribute("data-active", "true");
		expect(screen.getByRole("link", { name: "Atas" })).toHaveAttribute(
			"data-active",
			"false",
		);
	});
});
