import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input.tsx";

const meta = {
	title: "UI/Input",
	component: Input,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	args: {
		placeholder: "Digite algo…",
	},
};

export const ComValor: Story = {
	args: {
		defaultValue: "Turma 2025",
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
		placeholder: "Valor inválido",
		"aria-invalid": true,
	},
};

export const Email: Story = {
	args: {
		type: "email",
		placeholder: "email@escola.com",
	},
};
