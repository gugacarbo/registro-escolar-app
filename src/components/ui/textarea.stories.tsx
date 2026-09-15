import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea.tsx";

const meta = {
	title: "UI/Textarea",
	component: Textarea,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	args: {
		placeholder: "Escreva uma observação…",
	},
};

export const ComConteudo: Story = {
	args: {
		defaultValue: "Aluno apresentou bom desempenho nas atividades da semana.",
	},
};

export const Desabilitado: Story = {
	args: {
		placeholder: "Desabilitado",
		disabled: true,
	},
};

export const Invalido: Story = {
	args: {
		placeholder: "Campo obrigatório",
		"aria-invalid": true,
	},
};
