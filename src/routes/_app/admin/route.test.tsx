import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useAuthSession: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	Outlet: () => <div>conteúdo administrativo</div>,
	ClientOnly: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("#/components/ui/sonner", () => ({
	Toaster: () => null,
}));

vi.mock("#/lib/auth/session-context", () => ({
	useAuthSession: mocks.useAuthSession,
}));

import AdminLayout from "./route";

function adminSession() {
	return {
		session: { id: "session-1", userId: "admin-1" },
		user: {
			id: "admin-1",
			name: "Admin",
			email: "admin@e.com",
			role: "admin",
		},
	};
}

describe("AdminLayout", () => {
	beforeEach(() => {
		mocks.useAuthSession.mockReset();
	});

	it("exibe carregamento enquanto a sessão não existe", () => {
		mocks.useAuthSession.mockReturnValue(null);

		render(<AdminLayout />);

		expect(screen.getByText("Carregando...")).toBeInTheDocument();
		expect(
			screen.queryByText("conteúdo administrativo"),
		).not.toBeInTheDocument();
	});

	it("nega o acesso para sessão com papel user", () => {
		mocks.useAuthSession.mockReturnValue({
			session: { id: "session-1", userId: "user-1" },
			user: {
				id: "user-1",
				name: "Comum",
				email: "comum@e.com",
				role: "user",
			},
		});

		render(<AdminLayout />);

		expect(
			screen.getByRole("heading", { name: "Acesso negado" }),
		).toBeInTheDocument();
		expect(
			screen.queryByText("conteúdo administrativo"),
		).not.toBeInTheDocument();
	});

	it("exibe o conteúdo administrativo para sessão admin", () => {
		mocks.useAuthSession.mockReturnValue(adminSession());

		render(<AdminLayout />);

		expect(screen.getByText("conteúdo administrativo")).toBeInTheDocument();
		expect(screen.queryByText("Acesso negado")).not.toBeInTheDocument();
	});
});
