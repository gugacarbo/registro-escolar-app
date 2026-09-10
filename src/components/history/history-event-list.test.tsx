import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HistoryEventList } from "./history-event-list";

const baseEvent = {
	id: "event-1",
	tipo: "matricula",
	data: "2026-01-01T00:00:00Z",
	studentId: "student-1",
	studentName: "João",
	turmaId: "class-1",
	turmaNome: "Turma A",
	reuniaoId: null,
	reuniaoTitulo: null,
	reuniaoStatus: null,
	texto: null,
	categoriaId: null,
	componenteId: null,
	includeInMinutes: null,
	interno: false,
	metadata: {},
} as const;

describe("HistoryEventList", () => {
	it("exibe skeleton durante carregamento", () => {
		render(<HistoryEventList events={[]} isLoading isError={false} />);
		expect(screen.getByRole("generic", { busy: true })).toBeInTheDocument();
	});

	it("exibe erro", () => {
		render(<HistoryEventList events={[]} isLoading={false} isError />);
		expect(
			screen.getByText("Não foi possível carregar o histórico."),
		).toBeInTheDocument();
	});

	it("renderiza evento completo com registro interno", () => {
		render(
			<HistoryEventList
				events={[
					{
						...baseEvent,
						id: "event-2",
						tipo: "registro",
						texto: "Acompanhamento",
						reuniaoId: "meeting-1",
						reuniaoTitulo: "Conselho",
						interno: true,
					},
				]}
				isLoading={false}
				isError={false}
			/>,
		);
		expect(screen.getByText("Registro")).toBeInTheDocument();
		expect(screen.getByText("Acompanhamento")).toBeInTheDocument();
		expect(screen.getByText("Turma: Turma A")).toBeInTheDocument();
		expect(screen.getByText("Reunião: Conselho")).toBeInTheDocument();
		expect(screen.getByText("Registro interno")).toBeInTheDocument();
	});

	it("usa label e mensagem personalizadas", () => {
		render(
			<HistoryEventList
				events={[{ ...baseEvent, tipo: "custom" as never }]}
				isLoading={false}
				isError={false}
				emptyMessage="Vazio"
			/>,
		);
		expect(screen.getByText("custom")).toBeInTheDocument();
	});
});
