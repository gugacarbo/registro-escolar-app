import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type EntityOption, EntitySelect } from "./entity-select.tsx";

const meta: Meta = {
	title: "UI/EntitySelect",
	component: EntitySelect,
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const TODAS_AS_TURMAS: EntityOption[] = [
	{ id: "1a", name: "Turma 1A" },
	{ id: "1b", name: "Turma 1B" },
	{ id: "2a", name: "Turma 2A" },
	{ id: "2b", name: "Turma 2B" },
	{ id: "3a", name: "Turma 3A" },
];

export const Padrao: Story = {
	render: () => {
		return (
			<EntitySelectDemo
				options={TODAS_AS_TURMAS}
				total={TODAS_AS_TURMAS.length}
				loadedAll
				isLoading={false}
			/>
		);
	},
};

export const ListaParcial: Story = {
	render: () => {
		return (
			<EntitySelectDemo
				options={TODAS_AS_TURMAS.slice(0, 3)}
				total={12}
				loadedAll={false}
				isLoading={false}
			/>
		);
	},
};

export const Carregando: Story = {
	render: () => {
		return (
			<EntitySelectDemo options={[]} total={12} loadedAll={false} isLoading />
		);
	},
};

export const SemResultados: Story = {
	render: () => {
		return (
			<EntitySelectDemo options={[]} total={0} loadedAll isLoading={false} />
		);
	},
};

export const Desabilitado: Story = {
	render: () => {
		return (
			<EntitySelectDemo
				options={TODAS_AS_TURMAS}
				total={TODAS_AS_TURMAS.length}
				loadedAll
				isLoading={false}
				disabled
			/>
		);
	},
};

function EntitySelectDemo({
	options,
	total,
	loadedAll,
	isLoading,
	disabled,
}: {
	options: EntityOption[];
	total: number;
	loadedAll: boolean;
	isLoading: boolean;
	disabled?: boolean;
}) {
	const [value, setValue] = useState("");
	const [search, setSearch] = useState("");
	return (
		<div className="w-64">
			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value={value}
				onChange={setValue}
				options={options}
				isLoading={isLoading}
				total={total}
				loadedAll={loadedAll}
				search={search}
				onSearchChange={setSearch}
				disabled={disabled}
			/>
		</div>
	);
}
