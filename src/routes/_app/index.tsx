import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpenText,
	CalendarDays,
	FileText,
	GraduationCap,
	type LucideIcon,
} from "lucide-react";

import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { PageHeader, PageSection, PageShell } from "#/components/ui/page";

export const Route = createFileRoute("/_app/")({
	component: AppHome,
});

const ACTIONS: Array<{
	title: string;
	description: string;
	to: "/students" | "/meetings" | "/minutes" | "/classes";
	icon: LucideIcon;
	primary?: boolean;
}> = [
	{
		title: "Preparar turmas",
		description: "Cadastre turmas, matrículas e ofertas antes do conselho.",
		to: "/classes",
		icon: BookOpenText,
		primary: true,
	},
	{
		title: "Acompanhar estudantes",
		description: "Consulta rápida ao cadastro e ao histórico de cada aluno.",
		to: "/students",
		icon: GraduationCap,
	},
	{
		title: "Abrir reunião",
		description: "Registre o conselho com participações por turma.",
		to: "/meetings",
		icon: CalendarDays,
	},
	{
		title: "Emitir atas",
		description: "Gere, revise e aprove versões oficiais.",
		to: "/minutes",
		icon: FileText,
	},
];

function AppHome() {
	return (
		<PageShell>
			<PageHeader
				eyebrow="Sistema de registro"
				title="Central do conselho de classe"
				description="Organize turmas, acompanhamentos e atas oficiais em um fluxo único: preparar a reunião, registrar as observações e aprovar o documento final."
				actions={
					<Button asChild size="lg">
						<Link to="/meetings">
							Ir para reuniões
							<ArrowRight aria-hidden="true" />
						</Link>
					</Button>
				}
			/>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{ACTIONS.map((action) => (
					<Card
						key={action.title}
						className="group gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
					>
						<CardContent className="grid min-h-44 gap-4 p-5">
							<span
								className={action.primary ? "text-primary" : "text-primary/70"}
								aria-hidden="true"
							>
								<action.icon className="size-7" />
							</span>
							<div className="space-y-2">
								<h2 className="font-display text-lg leading-snug font-semibold tracking-tight">
									{action.title}
								</h2>
								<p className="text-sm leading-relaxed text-muted-foreground">
									{action.description}
								</p>
							</div>
							<Button
								asChild
								variant={action.primary ? "default" : "outline"}
								size="sm"
								className="mt-auto w-fit"
							>
								<Link to={action.to}>
									Abrir
									<ArrowRight aria-hidden="true" />
								</Link>
							</Button>
						</CardContent>
					</Card>
				))}
			</div>
			<PageSection
				title="Como o app se organiza"
				description="Quatro blocos operacionais conectados pelo histórico escolar."
			>
				<ol className="grid gap-4 text-sm md:grid-cols-4">
					{[
						["01", "Cadastre", "Estudantes, servidores, papéis e componentes."],
						["02", "Estruture", "Turmas, matrículas e ofertas curriculares."],
						[
							"03",
							"Registre",
							"Observações por aluno e relatos gerais da turma.",
						],
						["04", "Formalize", "Atas versionadas e aprovadas em PDF."],
					].map(([number, title, description]) => (
						<li
							key={number}
							className="rounded-md border border-dashed border-primary/18 bg-background/60 p-4"
						>
							<span className="font-display text-xs font-semibold tracking-[0.22em] text-primary/60">
								{number}
							</span>
							<h3 className="mt-2 font-semibold">{title}</h3>
							<p className="mt-1 leading-relaxed text-muted-foreground">
								{description}
							</p>
						</li>
					))}
				</ol>
			</PageSection>
		</PageShell>
	);
}
