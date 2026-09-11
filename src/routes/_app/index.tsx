import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpenText,
	CalendarDays,
	FileText,
	GraduationCap,
	type LucideIcon,
	Users,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { PageHeader, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { useClasses } from "#/hooks/classes/use-classes";
import { useMeetings } from "#/hooks/meetings/use-meetings";
import { useMinutes } from "#/hooks/minutes/use-minutes";
import { useStudents } from "#/hooks/students/use-students";

export const Route = createFileRoute("/_app/")({
	component: AppHome,
});

type Action = {
	title: string;
	to: "/students" | "/meetings" | "/minutes" | "/classes";
	icon: LucideIcon;
	primary?: boolean;
};

const ACTIONS: Action[] = [
	{
		title: "Preparar turmas",
		to: "/classes",
		icon: BookOpenText,
		primary: true,
	},
	{ title: "Acompanhar estudantes", to: "/students", icon: GraduationCap },
	{ title: "Abrir reunião", to: "/meetings", icon: CalendarDays },
	{ title: "Emitir atas", to: "/minutes", icon: FileText },
];

type Stat = {
	label: string;
	to: "/students" | "/meetings" | "/minutes" | "/classes";
	icon: LucideIcon;
	total?: number;
	loading: boolean;
};

function StatCard({ label, to, icon: Icon, total, loading }: Stat) {
	return (
		<Link
			to={to}
			data-slot="stat-card"
			className="grid gap-3 rounded-lg border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
		>
			<Icon className="size-5 text-primary/70" aria-hidden="true" />
			{loading ? (
				<Skeleton className="h-9 w-16" />
			) : (
				<span className="font-display text-3xl leading-none font-semibold tracking-tight">
					{total ?? 0}
				</span>
			)}
			<span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
				{label}
			</span>
		</Link>
	);
}

function ActionCard({ title, to, icon: Icon, primary }: Action) {
	return (
		<Link
			to={to}
			data-slot="action-card"
			className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
		>
			<span className="flex items-center gap-3">
				<span
					className={primary ? "text-primary" : "text-primary/70"}
					aria-hidden="true"
				>
					<Icon className="size-6" />
				</span>
				<span className="font-display text-base leading-snug font-semibold tracking-tight">
					{title}
				</span>
			</span>
			<ArrowRight
				className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary"
				aria-hidden="true"
			/>
		</Link>
	);
}

function AppHome() {
	const students = useStudents({ pageSize: 1 });
	const classes = useClasses({ pageSize: 1 });
	const meetings = useMeetings({ pageSize: 1 });
	const minutes = useMinutes({ pageSize: 1 });

	const stats: Stat[] = [
		{
			label: "Estudantes",
			to: "/students",
			icon: Users,
			total: students.data?.total,
			loading: students.isLoading,
		},
		{
			label: "Turmas",
			to: "/classes",
			icon: BookOpenText,
			total: classes.data?.total,
			loading: classes.isLoading,
		},
		{
			label: "Reuniões",
			to: "/meetings",
			icon: CalendarDays,
			total: meetings.data?.total,
			loading: meetings.isLoading,
		},
		{
			label: "Atas",
			to: "/minutes",
			icon: FileText,
			total: minutes.data?.total,
			loading: minutes.isLoading,
		},
	];

	return (
		<PageShell>
			<PageHeader
				eyebrow="Sistema de registro"
				title="Central do conselho de classe"
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
				{stats.map((stat) => (
					<StatCard key={stat.label} {...stat} />
				))}
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{ACTIONS.map((action) => (
					<ActionCard key={action.title} {...action} />
				))}
			</div>
		</PageShell>
	);
}
