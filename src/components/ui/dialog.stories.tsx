import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog.tsx";

const meta = {
	title: "UI/Dialog",
	component: Dialog,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Abrir dialog</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Excluir registro</DialogTitle>
					<DialogDescription>
						Esta ação não pode ser desfeita. O registro será removido
						permanentemente.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline">Cancelar</Button>
					<Button variant="destructive">Excluir</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const ComFormulario: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Novo aluno</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo aluno</DialogTitle>
					<DialogDescription>
						Preencha os dados básicos do aluno.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-4">
					<label className="grid gap-2">
						<span className="text-sm font-medium">Nome</span>
						<input
							className="border-border rounded-md border px-3 py-2 text-sm"
							placeholder="Nome completo"
						/>
					</label>
					<label className="grid gap-2">
						<span className="text-sm font-medium">E-mail</span>
						<input
							className="border-border rounded-md border px-3 py-2 text-sm"
							type="email"
							placeholder="aluno@escola.com"
						/>
					</label>
					<DialogFooter>
						<Button type="button" variant="outline">
							Cancelar
						</Button>
						<Button type="submit">Salvar</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	),
};
