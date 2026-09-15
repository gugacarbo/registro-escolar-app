import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, AlertDescription, AlertTitle } from "./alert.tsx";

const meta = {
	title: "UI/Alert",
	component: Alert,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	render: () => (
		<Alert className="w-96">
			<AlertTitle>Atenção</AlertTitle>
			<AlertDescription>
				O prazo de lançamento de notas encerra em 30/06.
			</AlertDescription>
		</Alert>
	),
};

export const Destrutivo: Story = {
	render: () => (
		<Alert variant="destructive" className="w-96">
			<AlertTitle>Erro ao salvar</AlertTitle>
			<AlertDescription>
				Verifique sua conexão e tente novamente.
			</AlertDescription>
		</Alert>
	),
};
