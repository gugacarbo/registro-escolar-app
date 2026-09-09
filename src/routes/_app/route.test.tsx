import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	getSession: vi.fn(),
	signOut: vi.fn(),
	setTheme: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	Outlet: () => <div>conteúdo privado</div>,
	useNavigate: () => mocks.navigate,
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
		opts?.select ? opts.select({ pathname: "/" }) : "/",
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: {
		getSession: mocks.getSession,
		signOut: mocks.signOut,
	},
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({ setTheme: mocks.setTheme }),
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

import { AppLayout } from "./route";

const session = {
	session: { id: "session-1", userId: "user-1" },
	user: { id: "user-1", name: "Operador", email: "operador@escola.test" },
};

beforeEach(() => {
	mocks.navigate.mockReset();
	mocks.getSession.mockReset();
	mocks.signOut.mockReset();
	mocks.setTheme.mockReset();
});

describe("AppLayout", () => {
	it("mantém o conteúdo disponível quando existe sessão", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		expect(await screen.findByText("conteúdo privado")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
	});

	it("exibe nome e email do usuário no header", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		expect(await screen.findByText("Operador")).toBeInTheDocument();
		expect(screen.getByText("operador@escola.test")).toBeInTheDocument();
	});

	it("exibe os botões de navegação na sidebar", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		const alunos = await screen.findByRole("link", { name: "Alunos" });
		expect(alunos).toHaveAttribute("href", "/students");
		expect(screen.getByRole("link", { name: "Turmas" })).toHaveAttribute(
			"href",
			"/classes",
		);
		expect(screen.getByRole("link", { name: "Servidores" })).toHaveAttribute(
			"href",
			"/staff",
		);
		expect(screen.getByRole("link", { name: "Papéis" })).toHaveAttribute(
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
		expect(screen.getAllByRole("link")).toHaveLength(7);
	});

	it("expõe o controle de tema no header", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		expect(
			await screen.findByRole("button", { name: /alternar tema/i }),
		).toBeInTheDocument();
	});

	it("alterna o tema pelo controle do header", async () => {
		const user = userEvent.setup();
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		await user.click(
			await screen.findByRole("button", { name: /alternar tema/i }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Escuro" }));

		expect(mocks.setTheme).toHaveBeenCalledWith("dark");
	});

	it("alterna para o tema claro pelo controle do header", async () => {
		const user = userEvent.setup();
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		await user.click(
			await screen.findByRole("button", { name: /alternar tema/i }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Claro" }));

		expect(mocks.setTheme).toHaveBeenCalledWith("light");
	});

	it("volta ao tema do sistema pelo controle do header", async () => {
		const user = userEvent.setup();
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		await user.click(
			await screen.findByRole("button", { name: /alternar tema/i }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Sistema" }));

		expect(mocks.setTheme).toHaveBeenCalledWith("system");
	});

	it("direciona para login quando não existe sessão", async () => {
		mocks.getSession.mockResolvedValue({ data: null });

		render(<AppLayout />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" }),
		);
		expect(screen.queryByText("conteúdo privado")).not.toBeInTheDocument();
	});

	it("direciona para login quando a checagem de sessão falha", async () => {
		mocks.getSession.mockRejectedValue(new Error("network"));

		render(<AppLayout />);

		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" }),
		);
	});

	it("não navega após desmontar durante a checagem de sessão", async () => {
		let resolveSession: (value: { data: null }) => void = () => {};
		mocks.getSession.mockReturnValue(
			new Promise<{ data: null }>((resolve) => {
				resolveSession = resolve;
			}),
		);

		const { unmount } = render(<AppLayout />);
		unmount();
		resolveSession({ data: null });

		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("usa navegação completa como fallback quando o logout falha", async () => {
		const originalHref = window.location.href;
		Object.defineProperty(window, "location", {
			value: { ...window.location, href: "" },
			writable: true,
		});
		mocks.getSession.mockResolvedValue({ data: session });
		mocks.signOut.mockResolvedValue({ data: null, error: { code: "ERROR" } });

		render(<AppLayout />);
		fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

		await waitFor(() => expect(window.location.href).toBe("/login"));
		Object.defineProperty(window, "location", {
			value: { ...window.location, href: originalHref },
			writable: true,
		});
	});

	it("encerra a sessão e retorna ao login", async () => {
		mocks.getSession.mockResolvedValue({ data: session });
		mocks.signOut.mockResolvedValue({ data: {}, error: null });

		render(<AppLayout />);
		fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

		await waitFor(() =>
			expect(mocks.signOut).toHaveBeenCalledWith({
				callbackURL: "/login",
			}),
		);
		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" }),
		);
	});
});
