import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
	type SearchableOption,
	SearchableSelect,
} from "./searchable-select.tsx";

const meta = {
	title: "UI/SearchableSelect",
	component: SearchableSelect,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof SearchableSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const TODOS_OS_ALUNOS: SearchableOption[] = [
	{ id: "1", name: "Ana Souza" },
	{ id: "2", name: "Bruno Lima" },
	{ id: "3", name: "Carla Dias" },
	{ id: "4", name: "Diego Alves" },
	{ id: "5", name: "Elisa Rocha" },
];

export const Padrao: Story = {
	render: () => {
		return <SearchableSelectDemo options={TODOS_OS_ALUNOS} />;
	},
};

export const ComValor: Story = {
	render: () => {
		return <SearchableSelectDemo options={TODOS_OS_ALUNOS} initial="2" />;
	},
};

export const Carregando: Story = {
	render: () => {
		return (
			<SearchableSelectDemo
				options={[]}
				isLoading
				loadingMessage="Buscando alunos..."
			/>
		);
	},
};

export const ComDica: Story = {
	render: () => {
		return (
			<SearchableSelectDemo
				options={TODOS_OS_ALUNOS}
				hint="A lista filtra pelo servidor conforme você digita."
			/>
		);
	},
};

export const Desabilitado: Story = {
	render: () => {
		return <SearchableSelectDemo options={TODOS_OS_ALUNOS} disabled />;
	},
};

function SearchableSelectDemo({
	options,
	initial,
	isLoading,
	loadingMessage,
	hint,
	disabled,
}: {
	options: SearchableOption[];
	initial?: string;
	isLoading?: boolean;
	loadingMessage?: string;
	hint?: string;
	disabled?: boolean;
}) {
	const [value, setValue] = useState(initial ?? "");
	const [search, setSearch] = useState("");
	return (
		<div className="w-64">
			<SearchableSelect
				label="Aluno"
				placeholder="Selecione o aluno"
				searchPlaceholder="Buscar aluno..."
				emptyMessage="Nenhum aluno encontrado para a busca."
				value={value}
				onChange={setValue}
				options={options}
				isLoading={isLoading}
				loadingMessage={loadingMessage}
				hint={hint}
				search={search}
				onSearchChange={setSearch}
				disabled={disabled}
			/>
		</div>
	);
}
