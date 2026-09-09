import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	getSession: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	Outlet: () => <div>conteúdo privado</div>,
	useNavigate: () => mocks.navigate,
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: {
		getSession: mocks.getSession,
		signOut: mocks.signOut,
	},
}));

import { AppLayout } from "./__layout";

const session = {
	session: { id: "session-1", userId: "user-1" },
	user: { id: "user-1", name: "Operador", email: "operador@escola.test" },
};

beforeEach(() => {
	mocks.navigate.mockReset();
	mocks.getSession.mockReset();
	mocks.signOut.mockReset();
});

describe("AppLayout", () => {
	it("mantém o conteúdo disponível quando existe sessão", async () => {
		mocks.getSession.mockResolvedValue({ data: session });

		render(<AppLayout />);

		expect(await screen.findByText("conteúdo privado")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
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
