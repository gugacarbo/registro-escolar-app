import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useIsMobile: vi.fn(),
}));

vi.mock("#/hooks/use-mobile.ts", () => ({
	useIsMobile: mocks.useIsMobile,
}));

import { Sidebar, SidebarProvider, SidebarTrigger } from "./sidebar";

beforeEach(() => {
	mocks.useIsMobile.mockReturnValue(false);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Sidebar", () => {
	it("expõe o controle de alternância em português", () => {
		render(
			<SidebarProvider>
				<SidebarTrigger />
			</SidebarProvider>,
		);

		expect(
			screen.getByRole("button", { name: "Alternar barra lateral" }),
		).toBeVisible();
	});

	it("identifica a barra lateral móvel em português para leitores de tela", () => {
		mocks.useIsMobile.mockReturnValue(true);
		render(
			<SidebarProvider>
				<SidebarTrigger />
				<Sidebar>
					<nav>Menu principal</nav>
				</Sidebar>
			</SidebarProvider>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Alternar barra lateral" }),
		);

		expect(screen.getByRole("dialog", { name: "Barra lateral" })).toBeVisible();
		expect(
			screen.getByText("Exibe a barra lateral em dispositivos móveis."),
		).toBeInTheDocument();
	});
});
