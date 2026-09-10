import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EntitySelect } from "./entity-select";

describe("EntitySelect", () => {
	it("renderiza busca, opções e aviso de resultado parcial", async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();
		render(
			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value=""
				onChange={vi.fn()}
				options={[{ id: "1", name: "Turma A" }]}
				isLoading={false}
				total={10}
				loadedAll={false}
				search=""
				onSearchChange={onSearchChange}
			/>,
		);
		expect(screen.getByLabelText("Buscar turma")).toBeInTheDocument();
		expect(
			screen.getByText("Mostrando 1 de 10. Refine a busca para ver mais."),
		).toBeInTheDocument();
		await user.type(screen.getByLabelText("Buscar turma"), "A");
		expect(onSearchChange).toHaveBeenCalled();
	});

	it("seleciona uma opção", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value=""
				onChange={onChange}
				options={[{ id: "1", name: "Turma A" }]}
				isLoading={false}
				total={1}
				loadedAll
				search=""
				onSearchChange={vi.fn()}
			/>,
		);
		await user.click(screen.getByLabelText("Turma"));
		await user.click(await screen.findByRole("option", { name: "Turma A" }));
		expect(onChange).toHaveBeenCalledWith("1");
	});

	it("desabilita busca e seleção", () => {
		render(
			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value=""
				onChange={vi.fn()}
				options={[]}
				isLoading={false}
				total={0}
				loadedAll
				search=""
				onSearchChange={vi.fn()}
				disabled
			/>,
		);
		expect(screen.getByLabelText("Buscar turma")).toBeDisabled();
		expect(screen.getByLabelText("Turma")).toBeDisabled();
	});

	it("mostra estado vazio e carregamento", () => {
		const { rerender } = render(
			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value=""
				onChange={vi.fn()}
				options={[]}
				isLoading={false}
				total={0}
				loadedAll
				search="zzz"
				onSearchChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByText("Nenhum turma encontrado para a busca."),
		).toBeInTheDocument();
		rerender(
			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value=""
				onChange={vi.fn()}
				options={[]}
				isLoading
				total={0}
				loadedAll={false}
				search=""
				onSearchChange={vi.fn()}
			/>,
		);
		expect(screen.getByText("Carregando turma...")).toBeInTheDocument();
	});
});
