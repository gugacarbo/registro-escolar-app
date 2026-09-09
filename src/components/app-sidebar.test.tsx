import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	pathname: "/",
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

function renderSidebar(pathname = "/") {
	mocks.pathname = pathname;
	return render(
		<SidebarProvider>
			<AppSidebar />
		</SidebarProvider>,
	);
}

describe("AppSidebar", () => {
	beforeEach(() => {
		mocks.pathname = "/";
	});

	it("exibe somente o botão Alunos apontando para a lista", () => {
		renderSidebar("/");

		const alunos = screen.getByRole("link", { name: "Alunos" });
		expect(alunos).toHaveAttribute("href", "/students");
		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(screen.queryByText("Início")).not.toBeInTheDocument();
		expect(screen.queryByText("Turmas")).not.toBeInTheDocument();
		expect(screen.queryByText("Servidores")).not.toBeInTheDocument();
		expect(screen.queryByText("Papéis")).not.toBeInTheDocument();
		expect(screen.queryByText("Componentes")).not.toBeInTheDocument();
		expect(screen.queryByText("Reuniões")).not.toBeInTheDocument();
		expect(screen.queryByText("Atas")).not.toBeInTheDocument();
	});

	it("marca Alunos como ativo na lista e nas subrotas", () => {
		const { unmount } = renderSidebar("/students/");
		expect(screen.getByRole("link", { name: "Alunos" })).toHaveAttribute(
			"data-active",
			"true",
		);
		unmount();

		renderSidebar("/students/import");
		expect(screen.getByRole("link", { name: "Alunos" })).toHaveAttribute(
			"data-active",
			"true",
		);
	});

	it("não marca Alunos como ativo fora da lista", () => {
		renderSidebar("/");

		expect(screen.getByRole("link", { name: "Alunos" })).toHaveAttribute(
			"data-active",
			"false",
		);
	});
});
