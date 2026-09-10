import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useClassHistory: vi.fn() }));
vi.mock("#/hooks/history/use-history", () => ({
	useClassHistory: mocks.useClassHistory,
}));

import { ClassHistoryPanel } from "./class-history-panel";

function renderPanel() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<ClassHistoryPanel classId="class-1" />
		</QueryClientProvider>,
	);
}

describe("ClassHistoryPanel", () => {
	it("renderiza resumo e eventos da turma", () => {
		mocks.useClassHistory.mockReturnValue({
			data: {
				turma: { id: "class-1", name: "Turma A" },
				estudantes: [{ id: "student-1" }],
				reunioes: [{ id: "meeting-1" }],
				eventos: [
					{
						id: "event-1",
						tipo: "matricula",
						data: "2026-01-01T00:00:00Z",
						texto: null,
						turmaNome: "Turma A",
						interno: false,
					},
				],
			},
			isLoading: false,
			isError: false,
		});
		renderPanel();
		expect(
			screen.getByRole("heading", { name: "Histórico da turma" }),
		).toBeInTheDocument();
		expect(screen.getByText("1 estudantes")).toBeInTheDocument();
		expect(screen.getByText("1 reuniões")).toBeInTheDocument();
		expect(screen.getByText("Matrícula")).toBeInTheDocument();
	});

	it("exibe erro", () => {
		mocks.useClassHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPanel();
		expect(
			screen.getByText("Não foi possível carregar o histórico."),
		).toBeInTheDocument();
	});
});
