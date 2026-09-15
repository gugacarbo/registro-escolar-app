import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";
import { Button } from "./button.tsx";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./empty.tsx";

const meta = {
	title: "UI/Empty",
	component: Empty,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	render: () => (
		<Empty className="w-96 border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Inbox />
				</EmptyMedia>
				<EmptyTitle>Nenhuma ata encontrada</EmptyTitle>
				<EmptyDescription>
					Crie a primeira ata ou ajuste os filtros de busca.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button>Criar ata</Button>
			</EmptyContent>
		</Empty>
	),
};

export const SemMedia: Story = {
	render: () => (
		<Empty className="w-96 border">
			<EmptyHeader>
				<EmptyTitle>Sem resultados</EmptyTitle>
				<EmptyDescription>Tente refinar os termos da busca.</EmptyDescription>
			</EmptyHeader>
		</Empty>
	),
};
