import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DataTable } from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { Form, FormNative, FormSubmit, useForm } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { PageSection, PageToolbar } from "#/components/ui/page";
import { DetailPage, FormPage, ListPage } from "#/components/ui/page-recipes";
import { SearchInput } from "#/components/ui/search-input";

type Ata = {
	id: string;
	nome: string;
	email: string;
};

const atasFake: Ata[] = Array.from({ length: 6 }, (_, index) => ({
	id: `ata-${index + 1}`,
	nome: `Pessoa ${index + 1}`,
	email: `pessoa${index + 1}@exemplo.com`,
}));

const columns = [
	{ key: "nome", header: "Nome", cell: (row: Ata) => row.nome },
	{ key: "email", header: "Email", cell: (row: Ata) => row.email },
];

function ToolbarSearchInput({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<SearchInput
			value={value}
			onChange={onChange}
			placeholder="Buscar atas..."
			ariaLabel="Buscar atas"
		/>
	);
}

function ListPageDemo() {
	const [busca, setBusca] = useState("");

	return (
		<ListPage
			title="Atas"
			actions={<Button size="sm">Nova ata</Button>}
			toolbar={
				<PageToolbar>
					<ToolbarSearchInput value={busca} onChange={setBusca} />
					<Button size="sm" variant="outline">
						Filtrar
					</Button>
				</PageToolbar>
			}
		>
			<DataTable
				columns={columns}
				rows={atasFake}
				getRowKey={(row) => row.id}
				total={atasFake.length}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				emptyTitle="Nada aqui"
				ariaLabel="Atas"
			/>
		</ListPage>
	);
}

function ListPageLoadingDemo() {
	const [busca, setBusca] = useState("");

	return (
		<ListPage
			title="Atas"
			actions={<Button size="sm">Nova ata</Button>}
			toolbar={
				<PageToolbar>
					<ToolbarSearchInput value={busca} onChange={setBusca} />
					<Button size="sm" variant="outline">
						Filtrar
					</Button>
				</PageToolbar>
			}
		>
			<DataTable
				columns={columns}
				rows={[]}
				getRowKey={(row) => row.id}
				total={0}
				page={1}
				pageSize={10}
				onPageChange={() => {}}
				onPageSizeChange={() => {}}
				isLoading
				emptyTitle="Nada aqui"
				ariaLabel="Atas"
			/>
		</ListPage>
	);
}

function DetailPageDemo() {
	return (
		<DetailPage
			title="Componente"
			backTo={{ to: "/", label: "Voltar" }}
			actions={<Button size="sm">Editar</Button>}
		>
			<PageSection title="Informações" description="Detalhes">
				<p className="text-sm text-muted-foreground">Conteúdo do componente.</p>
			</PageSection>
		</DetailPage>
	);
}

type FormValues = {
	nome: string;
	email: string;
};

function FormPageDemo() {
	const form = useForm<FormValues>({
		defaultValues: { nome: "", email: "" },
	});

	return (
		<FormPage
			title="Matricular"
			description="Nova matrícula"
			backTo={{ to: "/", label: "Voltar" }}
		>
			<Form {...form}>
				<FormNative
					onSubmit={() => form.handleSubmit(() => {})()}
					className="space-y-4"
				>
					<Input placeholder="Nome" {...form.register("nome")} />
					<Input placeholder="Email" type="email" {...form.register("email")} />
					<FormSubmit>Salvar</FormSubmit>
				</FormNative>
			</Form>
		</FormPage>
	);
}

const meta: Meta = {
	title: "UI/PageRecipes",
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;

type Story = StoryObj;

export const ListPagePadrao: Story = {
	render: () => <ListPageDemo />,
};

export const ListPageCarregando: Story = {
	render: () => <ListPageLoadingDemo />,
};

export const DetailPagePadrao: Story = {
	render: () => <DetailPageDemo />,
};

export const FormPagePadrao: Story = {
	render: () => <FormPageDemo />,
};
