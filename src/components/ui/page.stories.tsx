import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button.tsx";
import { PageHeader, PageSection, PageShell, PageToolbar } from "./page.tsx";
import { SearchInput } from "./search-input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select.tsx";

const meta = {
	title: "UI/Page",
	parameters: {
		layout: "padded",
	},
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PageShellPadrao: Story = {
	name: "PageShell Padrao",
	render: () => (
		<PageShell>
			<PageHeader title="Página simples" />
			<p className="text-sm text-muted-foreground">
				Conteúdo dentro do PageShell.
			</p>
		</PageShell>
	),
};

export const PageHeaderCompleto: Story = {
	name: "PageHeader Completo",
	render: () => (
		<PageHeader
			eyebrow="Caderno Institucional"
			title="Comunicados"
			description="Envie comunicados para turmas, famílias e servidores da escola."
			actions={
				<>
					<Button variant="outline" size="sm">
						Importar
					</Button>
					<Button size="sm">Novo comunicado</Button>
				</>
			}
		/>
	),
};

export const PageToolbarComControles: Story = {
	name: "PageToolbar ComControles",
	render: () => (
		<PageToolbar>
			<SearchInput placeholder="Buscar por nome ou email" className="w-64" />
			<Select defaultValue="todos">
				<SelectTrigger className="w-44" aria-label="Papel">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="todos">Todos os papéis</SelectItem>
					<SelectItem value="admin">Administrador</SelectItem>
					<SelectItem value="user">Usuário</SelectItem>
				</SelectContent>
			</Select>
			<Button size="sm" className="ml-auto">
				Filtrar
			</Button>
		</PageToolbar>
	),
};

export const PageSectionCompleta: Story = {
	name: "PageSection Completa",
	render: () => (
		<PageSection
			title="Dados da turma"
			description="Informações básicas exibidas no cabeçalho da turma."
			actions={
				<Button variant="ghost" size="sm">
					Editar
				</Button>
			}
		>
			<p className="text-sm text-muted-foreground">
				Conteúdo da seção aparece aqui.
			</p>
		</PageSection>
	),
};
