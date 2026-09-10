import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchableSelect } from "./searchable-select";

const options = [
	{ id: "1", name: "Matemática" },
	{ id: "2", name: "Português" },
];

describe("SearchableSelect", () => {
	it("abre com controle único e seleciona opção", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<SearchableSelect
				label="Componente curricular"
				placeholder="Selecione o componente"
				value=""
				onChange={onChange}
				options={options}
				search=""
				onSearchChange={vi.fn()}
			/>,
		);
		// Controle único: trigger + busca fica dentro do popup.
		expect(
			screen.getByRole("combobox", { name: "Componente curricular" }),
		).toBeInTheDocument();
		expect(
			screen.queryByPlaceholderText(/Buscar componente/),
		).not.toBeInTheDocument();
		await user.click(
			screen.getByRole("combobox", { name: "Componente curricular" }),
		);
		expect(
			screen.getByPlaceholderText(/Buscar componente/),
		).toBeInTheDocument();
		await user.click(screen.getByRole("option", { name: "Matemática" }));
		expect(onChange).toHaveBeenCalledWith("1");
	});

	it("exibe nome selecionado e mensagem de hint parcial", () => {
		render(
			<SearchableSelect
				label="Componente curricular"
				placeholder="Selecione o componente"
				value="2"
				onChange={vi.fn()}
				options={options}
				hint="Mostrando 2 de 50. Refine a busca para ver mais."
				search=""
				onSearchChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("combobox", { name: "Componente curricular" }),
		).toHaveTextContent("Português");
		expect(
			screen.getByText("Mostrando 2 de 50. Refine a busca para ver mais."),
		).toBeInTheDocument();
	});

	it("mostra carregamento dentro do popup", async () => {
		const user = userEvent.setup();
		render(
			<SearchableSelect
				label="Componente curricular"
				placeholder="Selecione o componente"
				value=""
				onChange={vi.fn()}
				options={[]}
				isLoading
				search=""
				onSearchChange={vi.fn()}
			/>,
		);
		await user.click(
			screen.getByRole("combobox", { name: "Componente curricular" }),
		);
		expect(
			screen.getByText("Carregando componente curricular..."),
		).toBeInTheDocument();
	});
});
