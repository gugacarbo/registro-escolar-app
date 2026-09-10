import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MeetingForm, type MeetingFormValues } from "./meeting-form";

function fetchJson(data: unknown, total: number) {
	return new Response(JSON.stringify({ data, total, page: 1, pageSize: 100 }), {
		status: 200,
	});
}

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
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = typeof input === "string" ? input : String(input);
		if (url.startsWith("/api/classes")) {
			return fetchJson(
				[{ id: "class-1", name: "Turma A", academicPeriod: "2026" }],
				1,
			);
		}
		if (url.startsWith("/api/staff")) {
			return fetchJson([{ id: "staff-1", name: "Maria" }], 1);
		}
		if (url.startsWith("/api/roles")) {
			return fetchJson([{ id: "role-1", name: "Coordenador" }], 1);
		}
		return new Response(JSON.stringify([]), { status: 200 });
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
		expect(await screen.findByText("Turma A — 2026")).toBeInTheDocument();
		await user.click(screen.getByText("Turma A — 2026"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit.mock.calls[0][0]).toMatchObject({
			nome: "Conselho",
			turmaIds: ["class-1"],
		});
	});
	it("adiciona participante com seletores pesquisáveis", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		renderForm(onSubmit);
		await user.type(screen.getByLabelText("Nome *"), "Conselho");
		expect(await screen.findByText("Turma A — 2026")).toBeInTheDocument();
		await user.click(screen.getByText("Turma A — 2026"));
		await user.click(
			screen.getByRole("button", { name: "Adicionar participante" }),
		);
		await user.click(screen.getByLabelText("Servidor"));
		await user.click(await screen.findByRole("option", { name: "Maria" }));
		await user.click(screen.getByLabelText("Papel"));
		await user.click(
			await screen.findByRole("option", { name: "Coordenador" }),
		);
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				nome: "Conselho",
				turmaIds: ["class-1"],
				participantes: [{ servidorId: "staff-1", papelId: "role-1" }],
			}),
			undefined,
		);
	});
});
