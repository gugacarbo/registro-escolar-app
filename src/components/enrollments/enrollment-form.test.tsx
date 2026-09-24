import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EnrollmentForm } from "./enrollment-form";

function fetchJson(data: unknown, total: number) {
	return new Response(JSON.stringify({ data, total, page: 1, pageSize: 100 }), {
		status: 200,
	});
}

describe("EnrollmentForm", () => {
	it("carrega estudantes e turmas pesquisáveis", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = typeof input === "string" ? input : String(input);
			if (url.startsWith("/api/students")) {
				return fetchJson([{ id: "student-1", name: "Ana" }], 1);
			}
			if (url.startsWith("/api/classes")) {
				return fetchJson(
					[{ id: "class-1", name: "Turma A", academicPeriod: "2026" }],
					1,
				);
			}
			return fetchJson([], 0);
		});
		render(
			<QueryClientProvider client={new QueryClient()}>
				<EnrollmentForm onSubmit={vi.fn()} />
			</QueryClientProvider>,
		);
		await user.click(screen.getByRole("combobox", { name: "Estudante" }));
		expect(
			await screen.findByRole("option", { name: "Ana" }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Buscar estudante..."),
		).toBeInTheDocument();
		await user.keyboard("{Escape}");
		await user.click(screen.getByRole("combobox", { name: "Turma" }));
		expect(
			await screen.findByRole("option", { name: "Turma A — 2026" }),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Buscar turma...")).toBeInTheDocument();
	});

	it("envia matrícula com seletores paginados", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = typeof input === "string" ? input : String(input);
			if (url.startsWith("/api/students")) {
				return fetchJson([{ id: "student-1", name: "Ana" }], 1);
			}
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
			return fetchJson([], 0);
		});
		render(
			<QueryClientProvider client={new QueryClient()}>
				<EnrollmentForm onSubmit={onSubmit} />
			</QueryClientProvider>,
		);
		await user.type(screen.getByLabelText("Data de início *"), "2026-02-01");
		await user.click(screen.getByLabelText("Estudante"));
		await user.click(await screen.findByRole("option", { name: "Ana" }));
		await user.click(screen.getByLabelText("Turma"));
		await user.click(
			await screen.findByRole("option", { name: "Turma A — 2026" }),
		);
		await user.click(screen.getByRole("button", { name: "Matricular" }));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				estudanteId: "student-1",
				turmaId: "class-1",
				dataInicio: "2026-02-01",
				dataTermino: "",
				status: "ativa",
			}),
			undefined,
		);
	});

	it("mostra o status em pt-BR e limita as opções para criação", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
			fetchJson([], 0),
		);
		const user = userEvent.setup();
		render(
			<QueryClientProvider client={new QueryClient()}>
				<EnrollmentForm onSubmit={vi.fn()} />
			</QueryClientProvider>,
		);

		const statusLabel = (await screen.findByText("Status")) as HTMLElement;
		const trigger = document.getElementById(
			statusLabel.getAttribute("for") as string,
		);
		expect(trigger).not.toBeNull();
		await user.click(trigger as Element);

		expect(
			await screen.findByRole("option", { name: "Ativa" }),
		).toBeInTheDocument();
		expect(screen.getAllByRole("option")).toHaveLength(1);
		expect(screen.queryByText("ativa")).not.toBeInTheDocument();
		expect(screen.queryByText("cancelada")).not.toBeInTheDocument();
	});
});
