import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";
import { DataTable, type DataTableColumn } from "../components/data-table.tsx";
import { Button } from "../components/ui/button.tsx";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormNative,
	FormSubmit,
} from "../components/ui/form.tsx";
import { Input } from "../components/ui/input.tsx";
import {
	PageHeader,
	PageSection,
	PageShell,
	PageToolbar,
} from "../components/ui/page.tsx";
import { SearchInput } from "../components/ui/search-input.tsx";

const meta = {
	title: "Design System/Compositions",
	parameters: {
		layout: "padded",
	},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Componente = {
	id: string;
	nome: string;
	email: string;
	papel: "admin" | "user";
};

const componentes: Componente[] = Array.from({ length: 8 }, (_, i) => {
	const n = i + 1;
	return {
		id: `c${n}`,
		nome: `Componente ${n}`,
		email: `comp${n}@escola.edu.br`,
		papel: n % 3 === 0 ? ("admin" as const) : ("user" as const),
	};
});

type Valores = { nome: string; slug: string };

function DetailFormDemo() {
	const form = useForm<Valores>({
		defaultValues: { nome: "Badge", slug: "badge" },
	});
	return (
		<Form {...form}>
			<FormNative className="max-w-md space-y-4" onSubmit={() => {}}>
				<FormField
					control={form.control}
					name="nome"
					rules={{ required: "Informe o nome." }}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="slug"
					rules={{ required: "Informe o slug." }}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Slug</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormSubmit>Salvar</FormSubmit>
			</FormNative>
		</Form>
	);
}

const columns: DataTableColumn<Componente>[] = [
	{ header: "Nome", cell: (row) => row.nome },
	{ header: "Email", cell: (row) => row.email },
	{
		header: "Papel",
		cell: (row) => (row.papel === "admin" ? "Admin" : "Usuário"),
	},
];

export const ListPageExample: Story = {
	name: "ListPage Example",
	render: () => (
		<PageShell>
			<PageHeader
				title="Componentes"
				description="Catálogo de componentes do design system."
				actions={<Button size="sm">Novo componente</Button>}
			/>
			<PageToolbar>
				<SearchInput placeholder="Buscar componente" className="w-64" />
				<Button size="sm">Filtrar</Button>
			</PageToolbar>
			<DataTable
				columns={columns}
				rows={componentes}
				getRowKey={(row) => row.id}
				total={componentes.length}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Nenhum componente encontrado"
				ariaLabel="Componentes"
			/>
		</PageShell>
	),
};

export const DetailFormExample: Story = {
	name: "Detail Form Example",
	render: () => (
		<PageShell>
			<PageHeader
				title="Detalhe do componente"
				actions={
					<Button variant="ghost" size="sm">
						Voltar
					</Button>
				}
			/>
			<PageSection
				title="Informações"
				description="Dados básicos do componente."
			>
				<DetailFormDemo />
			</PageSection>
		</PageShell>
	),
};
