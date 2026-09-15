import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button.tsx";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card.tsx";

const meta = {
	title: "UI/Card",
	component: Card,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Turma 9º ano B</CardTitle>
				<CardDescription>32 alunos matriculados</CardDescription>
				<CardAction>
					<Button variant="outline" size="sm">
						Editar
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Próximo conselho de classe agendado para 15/06.
				</p>
			</CardContent>
			<CardFooter className="justify-end gap-2">
				<Button variant="ghost" size="sm">
					Cancelar
				</Button>
				<Button size="sm">Salvar</Button>
			</CardFooter>
		</Card>
	),
};

export const SemFooter: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Resumo mensal</CardTitle>
				<CardDescription>Frequência média de 94%</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Nenhuma pendência registrada no período.
				</p>
			</CardContent>
		</Card>
	),
};
