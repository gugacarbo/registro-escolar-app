import type { Meta, StoryObj } from "@storybook/react-vite";
import type { DataTableColumn } from "./data-table.tsx";
import { DataTable } from "./data-table.tsx";

const meta = {
	title: "UI/DataTable",
	component: DataTable,
	parameters: {
		layout: "padded",
	},
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

type Usuario = {
	id: string;
	nome: string;
	email: string;
	papel: "admin" | "user";
};

const usuarios: Usuario[] = Array.from({ length: 12 }, (_, i) => {
	const n = i + 1;
	return {
		id: `u${n}`,
		nome: `Pessoa ${n}`,
		email: `pessoa${n}@escola.edu.br`,
		papel: n % 4 === 0 ? ("admin" as const) : ("user" as const),
	};
});

const columns: DataTableColumn<Usuario>[] = [
	{
		header: "Nome",
		cell: (row) => <span className="font-medium">{row.nome}</span>,
	},
	{ header: "Email", cell: (row) => row.email },
	{
		header: "Papel",
		cell: (row) => (row.papel === "admin" ? "Admin" : "Usuário"),
	},
];

const baseProps = {
	columns,
	rows: usuarios,
	getRowKey: (row: Usuario) => row.id,
	total: usuarios.length,
	page: 1,
	pageSize: 10,
	onPageChange: () => {},
	onPageSizeChange: () => {},
};

export const Padrao: Story = {
	name: "Padrao",
	render: () => (
		<DataTable
			{...baseProps}
			rows={usuarios.slice(0, 8)}
			ariaLabel="Usuários"
		/>
	),
};

export const Carregando: Story = {
	name: "Carregando",
	render: () => (
		<DataTable {...baseProps} rows={[]} isLoading ariaLabel="Usuários" />
	),
};

export const Erro: Story = {
	name: "Erro",
	render: () => (
		<DataTable
			{...baseProps}
			rows={[]}
			isError
			errorMessage="Não foi possível listar os usuários. Tente novamente em instantes."
			onRetry={() => {}}
			retryLabel="Recarregar"
			ariaLabel="Usuários"
		/>
	),
};

export const Vazio: Story = {
	name: "Vazio",
	render: () => (
		<DataTable
			{...baseProps}
			rows={[]}
			emptyTitle="Nenhum usuário encontrado"
			emptyDescription="Ajuste os filtros de busca ou convide novos usuários."
			ariaLabel="Usuários"
		/>
	),
};

export const ComPaginacao: Story = {
	name: "ComPaginacao",
	render: () => (
		<DataTable
			{...baseProps}
			rows={usuarios.slice(0, 8)}
			total={25}
			page={1}
			pageSize={8}
			onPageChange={(p) => console.log("page", p)}
			onPageSizeChange={(s) => console.log("pageSize", s)}
			ariaLabel="Usuários"
		/>
	),
};
