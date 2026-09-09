import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button.tsx";

const meta = {
	title: "UI/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	args: {
		children: "Salvar",
	},
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Destrutivo: Story = {
	args: {
		children: "Excluir",
		variant: "destructive",
	},
};

export const Contorno: Story = {
	args: {
		variant: "outline",
	},
};

export const Desabilitado: Story = {
	args: {
		disabled: true,
	},
};
