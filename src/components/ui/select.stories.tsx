import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "./select.tsx";

const meta = {
	title: "UI/Select",
	component: Select,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function SelectDemo({
	value,
	placeholder,
	grouped,
}: {
	value?: string;
	placeholder?: string;
	grouped?: boolean;
}) {
	const items = (
		<>
			<SelectItem value="1A">Turma 1A</SelectItem>
			<SelectItem value="1B">Turma 1B</SelectItem>
			<SelectItem value="2A">Turma 2A</SelectItem>
		</>
	);
	return (
		<Select defaultValue={value}>
			<SelectTrigger className="w-56" aria-label="Turma">
				<SelectValue placeholder={placeholder ?? "Selecione a turma"} />
			</SelectTrigger>
			<SelectContent>
				{grouped ? (
					<>
						<SelectLabel>Manhã</SelectLabel>
						<SelectItem value="1A">Turma 1A</SelectItem>
						<SelectLabel>Tarde</SelectLabel>
						{items}
					</>
				) : (
					items
				)}
			</SelectContent>
		</Select>
	);
}

export const Padrao: Story = {
	render: () => <SelectDemo placeholder="Selecione a turma" />,
};

export const ComValor: Story = {
	render: () => <SelectDemo value="1A" />,
};

export const ComGrupos: Story = {
	render: () => <SelectDemo placeholder="Selecione a turma" grouped />,
};

export const Desabilitado: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger className="w-56" aria-label="Turma">
				<SelectValue placeholder="Selecione a turma" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="1A">Turma 1A</SelectItem>
			</SelectContent>
		</Select>
	),
};
