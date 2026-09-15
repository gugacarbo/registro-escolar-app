import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

/**
 * Fundamentos do tema "Caderno Institucional" (src/styles.css).
 * Os swatches leem as CSS custom properties reais — nada é inventado aqui.
 */

type Token = { name: string; varName: string; usage: string };

const surfaceTokens: Token[] = [
	{ name: "background", varName: "--background", usage: "Fundo das páginas" },
	{ name: "card", varName: "--card", usage: "Superfície de cartões/seções" },
	{ name: "popover", varName: "--popover", usage: "Popovers e menus" },
	{ name: "primary", varName: "--primary", usage: "Ação principal / marca" },
	{ name: "secondary", varName: "--secondary", usage: "Ação secundária" },
	{
		name: "muted",
		varName: "--muted",
		usage: "Fundo suave (cabeçalho de tabela)",
	},
	{ name: "accent", varName: "--accent", usage: "Hover / destaque de item" },
	{
		name: "destructive",
		varName: "--destructive",
		usage: "Ações destrutivas e erros",
	},
	{ name: "border", varName: "--border", usage: "Bordas" },
	{ name: "input", varName: "--input", usage: "Borda de inputs" },
	{ name: "ring", varName: "--ring", usage: "Foco (focus-visible)" },
	{
		name: "highlight",
		varName: "--highlight",
		usage: "Eyebrow do PageHeader / seleção",
	},
];

const chartTokens: Token[] = Array.from({ length: 5 }, (_, i) => ({
	name: `chart-${i + 1}`,
	varName: `--chart-${i + 1}`,
	usage: "Séries de gráficos",
}));

const foregroundTokens: Token[] = [
	{ name: "foreground", varName: "--foreground", usage: "Texto principal" },
	{
		name: "card-foreground",
		varName: "--card-foreground",
		usage: "Texto em card",
	},
	{
		name: "primary-foreground",
		varName: "--primary-foreground",
		usage: "Texto sobre primary",
	},
	{
		name: "secondary-foreground",
		varName: "--secondary-foreground",
		usage: "Texto sobre secondary",
	},
	{
		name: "muted-foreground",
		varName: "--muted-foreground",
		usage: "Texto de apoio",
	},
	{
		name: "accent-foreground",
		varName: "--accent-foreground",
		usage: "Texto sobre accent",
	},
	{
		name: "destructive-foreground",
		varName: "--destructive-foreground",
		usage: "Texto sobre destructive",
	},
	{
		name: "highlight-foreground",
		varName: "--highlight-foreground",
		usage: "Texto sobre highlight",
	},
];

function Swatch({ token }: { token: Token }) {
	return (
		<div className="flex w-44 flex-col gap-1.5">
			<div
				className="h-14 w-full rounded-md border"
				style={{ background: `var(${token.varName})` }}
				title={`${token.varName} = var(${token.varName})`}
			/>
			<p className="font-mono text-xs font-semibold">{token.name}</p>
			<p className="text-xs leading-snug text-muted-foreground">
				{token.usage}
			</p>
			<p className="font-mono text-[0.625rem] text-muted-foreground/70">
				var({token.varName})
			</p>
		</div>
	);
}

function Group({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-3">
			<div>
				<h3 className="font-display text-lg leading-snug tracking-tight">
					{title}
				</h3>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>
			<div className="flex flex-wrap gap-4">{children}</div>
		</section>
	);
}

const PageDecorator: Decorator = (Story) => (
	<div className="min-h-64 w-full max-w-5xl bg-background p-8 text-foreground">
		<Story />
	</div>
);

const meta = {
	title: "Design System/Foundations",
	decorators: [PageDecorator],
	parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
	render: () => (
		<div className="space-y-10">
			<Group
				title="Superfície e ação"
				description="Tokens lidos do tema em tempo real — troque o tema na toolbar para conferir light/dark."
			>
				{surfaceTokens.map((token) => (
					<Swatch key={token.name} token={token} />
				))}
			</Group>
			<Group title="Texto (foregrounds)">
				{foregroundTokens.map((token) => (
					<Swatch key={token.name} token={token} />
				))}
			</Group>
			<Group title="Gráficos (chart-1..5)">
				{chartTokens.map((token) => (
					<Swatch key={token.name} token={token} />
				))}
			</Group>
		</div>
	),
};

export const Typography: Story = {
	render: () => (
		<div className="max-w-3xl space-y-8">
			<Group title="Título de página (PageHeader)">
				<h1 className="font-display text-2xl leading-tight tracking-tight text-balance sm:text-[2rem]">
					Alunos matriculados em 2025
				</h1>
			</Group>
			<Group title="Título de seção (PageSection)">
				<h2 className="font-display text-lg leading-snug tracking-tight">
					Documentos pendentes
				</h2>
			</Group>
			<Group title="Corpo e apoio">
				<p className="text-base">
					Corpo de texto padrão (text-base) — usado em conteúdo de listas e
					descrições longas.
				</p>
				<p className="text-sm text-muted-foreground">
					Texto de apoio (text-sm text-muted-foreground) — descrições, legendas
					e rodapé de tabela.
				</p>
				<p className="font-mono text-xs">
					Fonte mono (font-mono text-xs) — identificadores e valores técnicos.
				</p>
			</Group>
			<Group title="Famílias">
				<p className="font-display text-xl">
					font-display — "Iowan Old Style", "Palatino Linotype", "Book Antiqua",
					Georgia, serif
				</p>
				<p className="text-base">
					font-sans — "Avenir Next", "Segoe UI", "Trebuchet MS", "DejaVu Sans"
				</p>
			</Group>
			<Group title="Eyebrow (rótulo sobre o título)">
				<p className="flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.18em] text-primary/70 uppercase before:size-1.5 before:rounded-full before:bg-highlight">
					Secretaria acadêmica
				</p>
			</Group>
		</div>
	),
};

export const SpacingRadiusLayout: Story = {
	render: () => (
		<div className="max-w-3xl space-y-10">
			<Group
				title="Raio de borda"
				description="--radius: 0.5rem e derivados (rounded-sm/md/lg/xl) usados nos componentes."
			>
				{(
					[
						"rounded-sm",
						"rounded-md",
						"rounded-lg",
						"rounded-xl",
						"rounded-full",
					] as const
				).map((r) => (
					<div key={r} className="flex w-28 flex-col items-center gap-2">
						<div className={`h-16 w-24 border bg-card ${r}`} />
						<span className="font-mono text-xs">{r}</span>
					</div>
				))}
			</Group>
			<Group
				title="Escala de espaçamento em uso"
				description="Somente valores usados pelos padrões (p-3 toolbar, p-4/sm:p-5 seção, space-y-6 entre blocos)."
			>
				{[3, 4, 5, 6, 8].map((step) => (
					<div key={step} className="flex w-24 flex-col items-center gap-1">
						<div
							className="w-full bg-primary/20"
							style={{ height: `${step * 4}px` }}
						/>
						<span className="font-mono text-xs">
							{step} · {(step * 4) / 16}rem
						</span>
					</div>
				))}
			</Group>
			<Group
				title="Ritmo vertical encapsulado"
				description="PageShell aplica space-y-6 entre os blocos; PageSection aplica space-y-4 interno."
			>
				<div className="page-shell w-full space-y-6">
					<div className="rounded-lg border bg-card p-4 text-sm sm:p-5">
						Bloco 1 (card p-4 sm:p-5)
					</div>
					<div className="rounded-lg border bg-card p-4 text-sm sm:p-5">
						Bloco 2
					</div>
					<div className="rounded-lg border bg-card p-4 text-sm sm:p-5">
						Bloco 3
					</div>
				</div>
			</Group>
		</div>
	),
};
