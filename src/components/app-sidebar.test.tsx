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
});
