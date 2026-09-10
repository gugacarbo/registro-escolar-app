import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useComponents: vi.fn(),
	useParticipants: vi.fn(),
}));

vi.mock("#/hooks/components/use-components", () => ({
	useComponents: mocks.useComponents,
}));
vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: mocks.useParticipants,
}));

import { RecordForm } from "./record-form";

function renderForm(disabled = false) {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<RecordForm
				meetingId="meeting-1"
				submitLabel="Salvar"
				disabled={disabled}
				onSubmit={vi.fn()}
			/>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useComponents.mockReturnValue({ data: { data: [] } });
	mocks.useParticipants.mockReturnValue({ data: [] });
});

describe("RecordForm", () => {
	it("renderiza campos obrigatórios e opcionais", () => {
		renderForm();
		expect(screen.getByLabelText("Texto *")).toBeInTheDocument();
		expect(screen.getByLabelText("Componente curricular")).toBeInTheDocument();
		expect(screen.getByLabelText("Origem do registro")).toBeInTheDocument();
		expect(screen.getByLabelText("Incluir na ata")).toBeInTheDocument();
	});

	it("bloqueia campos quando disabled", () => {
		renderForm(true);
		expect(screen.getByLabelText("Texto *")).toBeDisabled();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
	});

	it("limpa o formulário", () => {
		renderForm();
		fireEvent.change(screen.getByLabelText("Texto *"), {
			target: { value: "Registro" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
		expect(screen.getByLabelText("Texto *")).toHaveValue("");
	});
});
