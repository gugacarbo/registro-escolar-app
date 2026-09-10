import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useClasses: vi.fn(),
	useStaff: vi.fn(),
	useRoles: vi.fn(),
	useMinuteTemplates: vi.fn(),
}));

vi.mock("#/hooks/classes/use-classes", () => ({
	useClasses: mocks.useClasses,
}));
vi.mock("#/hooks/staff/use-staff", () => ({ useStaff: mocks.useStaff }));
vi.mock("#/hooks/roles/use-roles", () => ({ useRoles: mocks.useRoles }));
vi.mock("#/hooks/minutes/use-minute-templates", () => ({
	useMinuteTemplates: mocks.useMinuteTemplates,
}));

import { MeetingForm, type MeetingFormValues } from "./meeting-form";

function renderForm(onSubmit: (values: MeetingFormValues) => void) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<MeetingForm onSubmit={onSubmit} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useClasses.mockReturnValue({
		data: {
			data: [{ id: "class-1", name: "Turma A", academicPeriod: "2026" }],
		},
	});
	mocks.useStaff.mockReturnValue({
		data: { data: [{ id: "staff-1", name: "Maria" }] },
	});
	mocks.useRoles.mockReturnValue({
		data: { data: [{ id: "role-1", name: "Coordenador" }] },
	});
	mocks.useMinuteTemplates.mockReturnValue({
		data: [{ id: "template-1", name: "Modelo padrão" }],
	});
});

describe("MeetingForm", () => {
	it("adiciona e remove participantes dinamicamente", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		renderForm(onSubmit);
		await user.click(
			screen.getByRole("button", { name: "Adicionar participante" }),
		);
		expect(screen.getAllByLabelText("Servidor").length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole("button", { name: "Remover" }));
		expect(screen.queryByLabelText("Servidor")).not.toBeInTheDocument();
	});

	it("seleciona turma e modelo de ata", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		renderForm(onSubmit);
		await user.type(screen.getByLabelText("Nome *"), "Conselho");
		await user.click(screen.getByText("Turma A — 2026"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit.mock.calls[0][0]).toMatchObject({
			nome: "Conselho",
			turmaIds: ["class-1"],
		});
	});
});
