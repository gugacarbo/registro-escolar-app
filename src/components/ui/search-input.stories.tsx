import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchInput } from "./search-input.tsx";

const meta: Meta = {
	title: "UI/SearchInput",
	component: SearchInput,
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	render: () => {
		return <SearchInputWithState initial="" placeholder="Buscar alunos…" />;
	},
};

export const ComTexto: Story = {
	render: () => {
		return (
			<SearchInputWithState initial="Maria" placeholder="Buscar alunos…" />
		);
	},
};

export const Largo: Story = {
	render: () => {
		return (
			<SearchInputWithState
				initial=""
				placeholder="Buscar em toda a escola…"
				className="w-96"
			/>
		);
	},
};

function SearchInputWithState({
	initial,
	placeholder,
	className,
}: {
	initial: string;
	placeholder: string;
	className?: string;
}) {
	const [value, setValue] = useState(initial);
	return (
		<SearchInput
			value={value}
			onChange={setValue}
			placeholder={placeholder}
			ariaLabel="Buscar"
			className={className}
		/>
	);
}
