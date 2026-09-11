import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

type Row = { id: string; name: string };

const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
	id: `row-${i + 1}`,
	name: `Linha ${i + 1}`,
}));

const columnsWithActions: DataTableColumn<Row>[] = [
	{ header: "Nome", cell: (row) => row.name },
	{
		header: "Ações",
		cell: (row) => (
			<>
				<button type="button">Editar {row.name}</button>
				<a href={`#${row.id}`}>Abrir {row.name}</a>
			</>
		),
	},
];

function renderTable(
	props: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
) {
	const onPageChange = vi.fn();
	const onPageSizeChange = vi.fn();
	const onRowClick = vi.fn();
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
	return { onPageChange, onPageSizeChange, onRowClick };
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

	it("na página inicial, o botão 'Anterior' não tem href nem foco", () => {
		renderTable({ page: 1 });

		const previous = document.querySelector(
			'[aria-label="Página anterior"]',
		) as HTMLAnchorElement;
		expect(previous).toBeInTheDocument();
		expect(previous).toHaveAttribute("aria-disabled", "true");
		expect(previous).not.toHaveAttribute("href");
		expect(previous).not.toHaveAttribute("tabindex");

		// a página ativa também é desabilitada (sem href)
		const activePage = document.querySelector('[aria-current="page"]');
		expect(activePage).toHaveTextContent("1");
		expect(activePage).not.toHaveAttribute("href");
		expect(screen.queryByRole("link", { name: "1" })).toBeNull();

		// itens habilitados continuam links com href="#"
		expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
			"href",
			"#",
		);
		expect(
			screen.getByRole("link", { name: "Próxima página" }),
		).toHaveAttribute("href", "#");
	});

	it("na última página, o botão 'Próxima' não tem href nem foco", () => {
		renderTable({ page: 3 });

		const next = document.querySelector(
			'[aria-label="Próxima página"]',
		) as HTMLAnchorElement;
		expect(next).toBeInTheDocument();
		expect(next).toHaveAttribute("aria-disabled", "true");
		expect(next).not.toHaveAttribute("href");
		expect(next).not.toHaveAttribute("tabindex");

		// a página ativa também é desabilitada (sem href)
		const activePage = document.querySelector('[aria-current="page"]');
		expect(activePage).toHaveTextContent("3");
		expect(activePage).not.toHaveAttribute("href");
		expect(screen.queryByRole("link", { name: "3" })).toBeNull();

		// itens habilitados continuam links com href="#"
		expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
			"href",
			"#",
		);
		expect(
			screen.getByRole("link", { name: "Página anterior" }),
		).toHaveAttribute("href", "#");
	});
});

describe("DataTable com onRowClick", () => {
	it("sem a prop, linhas não são focáveis nem clicáveis", () => {
		renderTable();

		const linhas = screen.getAllByRole("row");
		const linhasDoCorpo = linhas.filter(
			(linha) => within(linha).queryAllByRole("cell").length > 0,
		);
		for (const linha of linhasDoCorpo) {
			expect(linha).not.toHaveAttribute("tabindex");
			expect(linha).toHaveStyle({ cursor: "" });
		}
	});

	it("clicar em uma célula chama onRowClick uma vez com a linha correta", () => {
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		fireEvent.click(screen.getByRole("cell", { name: "Linha 1" }));

		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith(rows[0]);

		const linha = screen.getByRole("cell", { name: "Linha 1" }).closest("tr")!;
		expect(linha).toHaveAttribute("tabindex", "0");
		expect(linha).toHaveClass("cursor-pointer");
		expect(linha.className).toContain("focus-visible");
	});

	it("Enter e Espaço com foco na linha chamam onRowClick", () => {
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		const linha = screen.getByRole("cell", { name: "Linha 2" }).closest("tr")!;
		linha.focus();
		expect(linha).toHaveFocus();

		fireEvent.keyDown(linha, { key: "Enter" });
		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith(rows[1]);

		fireEvent.keyDown(linha, { key: " " });
		expect(onRowClick).toHaveBeenCalledTimes(2);
		expect(onRowClick).toHaveBeenCalledWith(rows[1]);

		fireEvent.keyDown(linha, { key: "Tab" });
		expect(onRowClick).toHaveBeenCalledTimes(2);

		fireEvent.keyDown(within(linha).getByText("Linha 2"), { key: "Enter" });
		expect(onRowClick).toHaveBeenCalledTimes(3);
		expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);
	});

	it("clique em botão ou link dentro da linha não chama onRowClick", () => {
		const onRowClick = vi.fn();
		renderTable({ onRowClick, columns: columnsWithActions });

		const linha = screen.getByRole("cell", { name: "Linha 1" }).closest("tr")!;
		fireEvent.click(
			within(linha).getByRole("button", { name: "Editar Linha 1" }),
		);
		expect(onRowClick).not.toHaveBeenCalled();

		fireEvent.click(within(linha).getByRole("link", { name: "Abrir Linha 1" }));
		expect(onRowClick).not.toHaveBeenCalled();

		fireEvent.click(within(linha).getByText("Linha 1"));
		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith(rows[0]);
	});

	it("paginação continua funcionando com linhas clicáveis", () => {
		const onRowClick = vi.fn();
		const { onPageChange } = renderTable({ onRowClick });

		fireEvent.click(screen.getByRole("link", { name: "3" }));
		expect(onPageChange).toHaveBeenCalledWith(3);

		fireEvent.click(screen.getByRole("cell", { name: "Linha 1" }));
		expect(onRowClick).toHaveBeenCalledTimes(1);

		expect(
			screen.getByRole("link", { name: "Próxima página" }),
		).toBeInTheDocument();
	});
});

describe("DataTable variações de colunas e skeleton", () => {
	it("renderiza headers como nó, chaves explícitas e alinhamentos", () => {
		render(
			<DataTable<Row>
				columns={[
					{
						key: "left",
						header: <span>Nome header</span>,
						cell: (row) => row.name,
					},
					{
						key: "center",
						header: "Centro",
						align: "center",
						cell: () => "Centro",
					},
					{
						key: "right",
						header: "Direita",
						align: "right",
						cell: () => "Direita",
					},
					{
						key: "actions",
						header: <span>Ações header</span>,
						align: "left",
						skeletonClassName: "h-5",
						cell: () => "Ações",
					},
				]}
				rows={[]}
				getRowKey={(row) => row.id}
				total={0}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Vazio"
			/>,
		);
		expect(screen.getByText("Nome header")).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Centro" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Direita" }),
		).toBeInTheDocument();
		expect(screen.getByText("Ações header")).toBeInTheDocument();
	});

	it("usa skeleton customizado durante loading", () => {
		render(
			<DataTable<Row>
				columns={[
					{
						key: "name",
						header: "Nome",
						skeletonClassName: "skeleton-name",
						cell: (row) => row.name,
					},
				]}
				rows={[]}
				getRowKey={(row) => row.id}
				total={10}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				isLoading
				emptyTitle="Vazio"
			/>,
		);
		expect(document.querySelector(".skeleton-name")).toBeInTheDocument();
	});

	it("rendera skeleton com alinhamentos em todas as posições", () => {
		render(
			<DataTable<Row>
				columns={[
					{ header: "Primeira", cell: (row) => row.name },
					{ header: "Meio", cell: (row) => row.name },
					{ header: "Última", align: "right", cell: (row) => row.name },
				]}
				rows={[]}
				getRowKey={(row) => row.id}
				total={10}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				isLoading
				emptyTitle="Vazio"
			/>,
		);
		expect(screen.getAllByRole("cell").length).toBeGreaterThan(0);
	});

	it("rendera células com alinhamento variado fora do loading", () => {
		render(
			<DataTable<Row>
				columns={[
					{ header: "Primeira", cell: (row) => row.name },
					{ header: "Meio", align: "center", cell: () => "Centro" },
					{ header: "Última", align: "right", cell: () => "Direita" },
				]}
				rows={rows}
				getRowKey={(row) => row.id}
				total={10}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Vazio"
			/>,
		);
		expect(
			screen.getAllByRole("cell", { name: "Centro" })[0],
		).toBeInTheDocument();
		expect(
			screen.getAllByRole("cell", { name: "Direita" })[0],
		).toBeInTheDocument();
	});

	it("Enter em elemento interno da linha não chama onRowClick", () => {
		const onRowClick = vi.fn();
		render(
			<DataTable<Row>
				columns={[
					{
						key: "actions",
						header: <span>Ações node</span>,
						cell: (row) => <button type="button">{row.name}</button>,
					},
				]}
				rows={rows}
				getRowKey={(row) => row.id}
				total={10}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				onRowClick={onRowClick}
				emptyTitle="Vazio"
			/>,
		);
		fireEvent.keyDown(screen.getByRole("button", { name: "Linha 1" }), {
			key: "Enter",
		});
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it("rendera ellipsis inicial e final em páginas centrais", () => {
		render(
			<DataTable<Row>
				columns={[{ header: "Nome", cell: (row) => row.name }]}
				rows={rows}
				getRowKey={(row) => row.id}
				total={80}
				page={4}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Vazio"
			/>,
		);
		expect(
			document.querySelectorAll("\[data-slot=pagination-ellipsis\]").length,
		).toBeGreaterThanOrEqual(2);
	});
});
