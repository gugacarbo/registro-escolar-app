import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OfferForm } from "./offer-form";

function fetchJson(data: unknown, total: number) {
	return new Response(JSON.stringify({ data, total, page: 1, pageSize: 100 }), {
		status: 200,
	});
}

function renderForm() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<OfferForm onSubmit={vi.fn()} />
		</QueryClientProvider>,
	);
}

describe("OfferForm", () => {
	it("carrega turmas, componentes e servidores pesquisáveis", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = typeof input === "string" ? input : String(input);
			if (url.startsWith("/api/classes")) {
				return fetchJson(
					[{ id: "class-1", name: "Turma A", academicPeriod: "2026" }],
					1,
				);
			}
			if (url.startsWith("/api/components")) {
				return fetchJson([{ id: "component-1", name: "Matemática" }], 1);
			}
			if (url.startsWith("/api/staff")) {
				return fetchJson([{ id: "staff-1", name: "Maria" }], 1);
			}
			return fetchJson([], 0);
		});
		renderForm();
		await user.click(screen.getByRole("combobox", { name: "Turma" }));
		expect(
			await screen.findByRole("option", { name: "Turma A — 2026" }),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Buscar turma...")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("combobox", { name: "Componente" }));
		expect(
			await screen.findByRole("option", { name: "Matemática" }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Buscar componente..."),
		).toBeInTheDocument();
		await user.keyboard("{Escape}");
		expect(screen.getByLabelText("Buscar servidor")).toBeInTheDocument();
		expect(await screen.findByText("Maria")).toBeInTheDocument();
	});

	it("envia oferta com componente e professores selecionados", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = typeof input === "string" ? input : String(input);
			if (url.startsWith("/api/classes")) {
				return fetchJson(
					[
						{
							id: "class-1",
							name: "Turma A",
							academicPeriod: "2026",
						},
					],
					1,
				);
			}
			if (url.startsWith("/api/components")) {
				return fetchJson([{ id: "component-1", name: "Matemática" }], 1);
			}
			if (url.startsWith("/api/staff")) {
				return fetchJson([{ id: "staff-1", name: "Maria" }], 1);
			}
			return fetchJson([], 0);
		});
		render(
			<QueryClientProvider client={new QueryClient()}>
				<OfferForm onSubmit={onSubmit} />
			</QueryClientProvider>,
		);
		await user.click(screen.getByLabelText("Turma"));
		await user.click(
			await screen.findByRole("option", { name: "Turma A — 2026" }),
		);
		await user.click(screen.getByLabelText("Componente"));
		await user.click(await screen.findByRole("option", { name: "Matemática" }));
		await user.click(screen.getByText("Maria"));
		await user.click(
			screen.getByRole("button", { name: "Ofertar componente" }),
		);
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				turmaId: "class-1",
				componenteId: "component-1",
				professorIds: ["staff-1"],
			}),
			undefined,
		);
	});

	it("valida campos obrigatórios", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
			fetchJson([], 0),
		);
		const onSubmit = vi.fn();
		render(
			<QueryClientProvider client={new QueryClient()}>
				<OfferForm onSubmit={onSubmit} />
			</QueryClientProvider>,
		);
		await user.click(
			screen.getByRole("button", { name: "Ofertar componente" }),
		);
		expect(await screen.findByText("Turma é obrigatória")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
