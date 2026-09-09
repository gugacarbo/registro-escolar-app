import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table";

type Row = { id: string; name: string };

const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
	id: `row-${i + 1}`,
	name: `Linha ${i + 1}`,
}));

function renderTable(
	props: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
) {
	const onPageChange = vi.fn();
	const onPageSizeChange = vi.fn();
	render(
		<DataTable<Row>
			columns={[{ header: "Nome", cell: (row) => row.name }]}
			rows={rows}
			getRowKey={(row) => row.id}
			total={25}
			page={2}
			pageSize={10}
			onPageChange={onPageChange}
			onPageSizeChange={onPageSizeChange}
			emptyTitle="Nada aqui"
			{...props}
		/>,
	);
	return { onPageChange, onPageSizeChange };
}

describe("DataTable", () => {
	it("renderiza linhas, contador e páginas com ellipsis", () => {
		renderTable({ total: 200 });

		expect(
			screen.getByRole("table", { name: "Tabela de resultados" }),
		).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "Linha 1" })).toBeInTheDocument();
		expect(screen.getByText("Mostrando 11–20 de 200")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "1" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "20" })).toBeInTheDocument();
	});

	it("navega para anterior, próxima e página específica", () => {
		const { onPageChange } = renderTable();

		fireEvent.click(screen.getByRole("link", { name: "3" }));
		expect(onPageChange).toHaveBeenCalledWith(3);

		fireEvent.click(
			within(screen.getByRole("navigation")).getAllByRole("link")[0]!,
		);
		expect(onPageChange).toHaveBeenCalledWith(1);

		fireEvent.click(screen.getByRole("link", { name: "Próxima página" }));
		expect(onPageChange).toHaveBeenCalledWith(3);
	});

	it("omite o ellipsis inicial quando a página está no começo", () => {
		render(
			<DataTable<Row>
				columns={[{ header: "Nome", cell: (row) => row.name }]}
				rows={rows}
				getRowKey={(row) => row.id}
				total={200}
				page={2}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Nada aqui"
			/>,
		);
		expect(screen.getByRole("link", { name: "20" })).toBeInTheDocument();
		expect(screen.getAllByText("More pages")).toHaveLength(1);
	});

	it("troca o pageSize pelo seletor", async () => {
		const { onPageSizeChange } = renderTable({ page: 3 });
		const user = (await import("@testing-library/user-event")).default.setup();

		await user.click(
			screen.getByRole("combobox", { name: "Itens por página" }),
		);
		await user.click(screen.getByRole("option", { name: "20 / página" }));

		expect(onPageSizeChange).toHaveBeenCalledWith(20);
	});

	it("exibe skeleton no carregamento e vazio sem resultados", () => {
		const { rerender } = render(
			<DataTable<Row>
				columns={[{ header: "Nome", cell: (row) => row.name }]}
				rows={[]}
				getRowKey={(row) => row.id}
				total={0}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Nada aqui"
				emptyDescription="Sem dados"
				isLoading
			/>,
		);
		expect(screen.getByRole("table")).toBeInTheDocument();

		rerender(
			<DataTable<Row>
				columns={[{ header: "Nome", cell: (row) => row.name }]}
				rows={[]}
				getRowKey={(row) => row.id}
				total={0}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Nada aqui"
				emptyDescription="Sem dados"
			/>,
		);
		expect(screen.getByText("Nada aqui")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		renderTable({ rows: [], total: 0, isError: true });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar os dados",
		);
	});
});
