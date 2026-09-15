import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge.tsx";

const meta = {
	title: "UI/Badge",
	component: Badge,
	parameters: {
		layout: "centered",
	},
	args: {
		children: "Ativo",
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Secundario: Story = {
	args: {
		variant: "secondary",
		children: "Rascunho",
	},
};

export const Destrutivo: Story = {
	args: {
		variant: "destructive",
		children: "Cancelado",
	},
};

export const Contorno: Story = {
	args: {
		variant: "outline",
		children: "Em revisão",
	},
};

export const Fantasma: Story = {
	args: {
		variant: "ghost",
		children: "Arquivado",
	},
};

export const Link: Story = {
	args: {
		variant: "link",
		children: "Ver detalhes",
	},
};

export const TodasVariants: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-2">
			<Badge>Padrão</Badge>
			<Badge variant="secondary">Secundário</Badge>
			<Badge variant="destructive">Destrutivo</Badge>
			<Badge variant="outline">Contorno</Badge>
			<Badge variant="ghost">Fantasma</Badge>
			<Badge variant="link">Link</Badge>
		</div>
	),
};
