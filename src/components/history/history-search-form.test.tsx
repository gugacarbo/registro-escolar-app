import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HistorySearchForm } from "./history-search-form";

function wrapper({ children }: { children: React.ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockEntityPages() {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith("/api/classes")) {
				return {
					ok: true,
					json: async () => ({
						data: [
							{ id: "class-1", name: "Turma A" },
							{ id: "class-2", name: "Turma B" },
						],
						total: 2,
					}),
				} as unknown as Response;
			}
			return {
				ok: true,
				json: async () => ({
					data: [{ id: "comp-1", name: "Matemática" }],
					total: 1,
				}),
			} as unknown as Response;
		}),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("HistorySearchForm", () => {
	it("renderiza selects com busca em vez de inputs de UUID", async () => {
		mockEntityPages();
		render(<HistorySearchForm onSubmit={vi.fn()} />, { wrapper });

		expect(
			screen.queryByPlaceholderText("ID da turma"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByPlaceholderText("ID do componente"),
		).not.toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "Turma" })).toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: "Componente" }),
		).toBeInTheDocument();
		// As opções carregam dos endpoints paginados.
		await userEvent.click(
			// abre o select de componente para verificar a lista remota
			screen.getByRole("combobox", { name: "Componente" }),
		);
		expect(
			await screen.findByRole("option", { name: "Matemática" }),
		).toBeInTheDocument();
	});

	it("seleciona uma turma no select e submete com o turmaId correto", async () => {
		mockEntityPages();
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<HistorySearchForm onSubmit={onSubmit} />, { wrapper });

		await user.click(screen.getByRole("combobox", { name: "Turma" }));
		await user.click(await screen.findByRole("option", { name: "Turma A" }));
		await user.click(screen.getByRole("button", { name: "Filtrar" }));

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ turmaId: "class-1" }),
			),
		);
	});

	it("omite o select de turma com hideStudentFilters e submete vazio", async () => {
		mockEntityPages();
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<HistorySearchForm onSubmit={onSubmit} hideStudentFilters />, {
			wrapper,
		});

		expect(
			screen.queryByRole("combobox", { name: "Turma" }),
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Filtrar" }));

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ turmaId: "", componenteId: "" }),
			),
		);
	});
});
