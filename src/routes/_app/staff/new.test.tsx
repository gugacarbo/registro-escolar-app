import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useNavigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: mocks.useNavigate,
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

import { NewStaffPage } from "./new";

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<NewStaffPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("NewStaffPage", () => {
	it("exibe link Voltar apontando para a lista de servidores", () => {
		renderPage();

		const link = screen.getByRole("link", { name: "Voltar" });
		expect(link).toHaveAttribute("href", "/staff");
	});
});
