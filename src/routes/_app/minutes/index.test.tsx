import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useMinutes: vi.fn(),
	useNavigate: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	Link: ({
		children,
		to,
		...rest
	}: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
	useNavigate: mocks.useNavigate,
}));

vi.mock("#/hooks/minutes/use-minutes", () => ({
	useMinutes: mocks.useMinutes,
}));

import { Route } from "./index";

const MinutesPage = (Route as unknown as { component: React.ComponentType })
	.component;

beforeEach(() => {
	mocks.useMinutes.mockReturnValue({
		data: { data: [], total: 0 },
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	});
	mocks.useNavigate.mockReturnValue(mocks.navigate);
});

describe("MinutesPage", () => {
	it("não exibe mais o atalho de modelos no cabeçalho de Atas", () => {
		render(<MinutesPage />);

		expect(screen.getByRole("heading", { name: "Atas" })).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /modelos de ata/i }),
		).not.toBeInTheDocument();
	});
});
