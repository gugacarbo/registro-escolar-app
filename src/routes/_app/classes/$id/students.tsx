import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	CalendarDaysIcon,
	CalendarIcon,
	ClockIcon,
	GraduationCapIcon,
	HistoryIcon,
	Users2Icon,
} from "lucide-react";
import { useState } from "react";
import { EnrollmentStatusBadge } from "#/components/enrollments/enrollment-status-badge";
import { HistoryEventList } from "#/components/history/history-event-list";
import {
	HistorySearchForm,
	type HistorySearchValues,
} from "#/components/history/history-search-form";
import { MeetingStatusBadge } from "#/components/meetings/meeting-status-badge";
import { ClassOffersPanel } from "#/components/offers/class-offers-panel";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { PageHeader, PageSection, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import type { HistoryFilters } from "#/hooks/history/use-history";
import { useClassHistory } from "#/hooks/history/use-history";
import { useOffers } from "#/hooks/offers/use-offers";
import type { ClassHistoryStudent } from "#/lib/history/types";

export const Route = createFileRoute("/_app/classes/$id/students")({
	component: ClassStudentsPage,
});

/** Formata datas puras (YYYY-MM-DD no ISO) sem desvio de fuso horário. */
function formatDate(value: string) {
	const [year, month, day] = value.slice(0, 10).split("-").map(Number);
	return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
		dateStyle: "short",
	});
}

function formatDateTime(value: string) {
	return new Date(value).toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function orderStudents(rows: ClassHistoryStudent[]) {
	return [...rows].sort((a, b) => {
		const activeDelta =
			Number(b.status === "ativa") - Number(a.status === "ativa");
		if (activeDelta !== 0) {
			return activeDelta;
		}
		return b.startDate.localeCompare(a.startDate);
	});
}

export default function ClassStudentsPage() {
	const { id } = Route.useParams();
	const [filters, setFilters] = useState<HistoryFilters>({});
	const [activeTab, setActiveTab] = useState("estudantes");
	const { data, isLoading, isError } = useClassHistory(id, filters);
	const { data: offers } = useOffers(id);

	const students = data?.estudantes ?? [];
	const meetings = data?.reunioes ?? [];
	const events = data?.eventos ?? [];
	const activeCount = students.filter(
		(student) => student.status === "ativa",
	).length;
	const latestMeeting = meetings[meetings.length - 1];

	function handleSearch(values: HistorySearchValues) {
		setFilters({
			q: values.q || undefined,
			componenteId: values.componenteId || undefined,
			periodo: values.periodo || undefined,
		});
	}

	return (
		<PageShell>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/classes">Turmas</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Estudantes da turma</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				eyebrow="Estrutura escolar"
				title={data ? data.turma.name : "Estudantes da turma"}
				description={
					data ? (
						<div className="flex flex-wrap items-center gap-x-5 gap-y-1">
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<CalendarIcon className="size-4 shrink-0 text-primary/70" />
								Período letivo{" "}
								<strong className="font-medium text-foreground">
									{data.turma.academicPeriod}
								</strong>
							</span>
							{data.turma.course && (
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<BookOpenIcon className="size-4 shrink-0 text-primary/70" />
									Curso{" "}
									<strong className="font-medium text-foreground">
										{data.turma.course}
									</strong>
								</span>
							)}
							{data.turma.grade && (
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<GraduationCapIcon className="size-4 shrink-0 text-primary/70" />
									Ano{" "}
									<strong className="font-medium text-foreground">
										{data.turma.grade}
									</strong>
								</span>
							)}
							{data.turma.shift && (
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<ClockIcon className="size-4 shrink-0 text-primary/70" />
									Turno{" "}
									<strong className="font-medium text-foreground">
										{data.turma.shift}
									</strong>
								</span>
							)}
						</div>
					) : isLoading ? (
						<Skeleton className="h-4 w-64" />
					) : undefined
				}
				actions={
					<Button asChild variant="secondary">
						<Link to="/classes/enroll">Matricular estudante</Link>
					</Button>
				}
			/>

			{isError && (
				<div
					role="alert"
					className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive shadow-xs"
				>
					Não foi possível carregar os dados da turma.
				</div>
			)}

			{data && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
								Estudantes vinculados
								<Users2Icon className="size-4 text-primary/60" />
							</CardDescription>
							<CardTitle className="text-2xl font-bold">
								{students.length}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-xs text-muted-foreground">
							{activeCount > 0
								? `${activeCount} vínculo(s) ativo(s)`
								: "Nenhum vínculo ativo"}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
								Reuniões
								<CalendarDaysIcon className="size-4 text-primary/60" />
							</CardDescription>
							<CardTitle className="text-2xl font-bold">
								{meetings.length}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-xs text-muted-foreground">
							{latestMeeting?.heldAt
								? `Última em ${formatDate(latestMeeting.heldAt)}`
								: latestMeeting
									? "Última sem data"
									: "Nenhuma realizada"}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
								Eventos no histórico
								<HistoryIcon className="size-4 text-primary/60" />
							</CardDescription>
							<CardTitle className="text-2xl font-bold">
								{events.length}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-xs text-muted-foreground">
							Registros, reuniões e relatos
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
								Ofertas
								<BookOpenIcon className="size-4 text-primary/60" />
							</CardDescription>
							<CardTitle className="text-2xl font-bold">
								{offers ? offers.length : "…"}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-xs text-muted-foreground">
							Componentes ofertados na turma
						</CardContent>
					</Card>
				</div>
			)}

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-4"
			>
				<TabsList>
					<TabsTrigger value="estudantes">
						Estudantes ({data ? students.length : "…"})
					</TabsTrigger>
					<TabsTrigger value="ofertas">
						Ofertas ({offers ? offers.length : "…"})
					</TabsTrigger>
					<TabsTrigger value="reunioes">
						Reuniões ({data ? meetings.length : "…"})
					</TabsTrigger>
					<TabsTrigger value="linha-do-tempo">
						Linha do tempo ({data ? events.length : "…"})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="estudantes" className="space-y-4">
					<PageSection
						title="Estudantes"
						description="Vínculos ativos e encerrados da turma, com o período de cada matrícula."
					>
						{isLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						) : students.length === 0 ? (
							<Empty className="border-0">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Users2Icon />
									</EmptyMedia>
									<EmptyTitle>Nenhum estudante vinculado</EmptyTitle>
									<EmptyDescription>
										Matricule um estudante nesta turma para acompanhar os
										vínculos.
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<Button asChild variant="outline" size="sm">
										<Link to="/classes/enroll">Matricular estudante</Link>
									</Button>
								</EmptyContent>
							</Empty>
						) : (
							<ul aria-label="Estudantes vinculados" className="grid gap-2">
								{orderStudents(students).map((student) => (
									<li
										key={`${student.studentId}-${student.startDate}`}
										className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/40 p-3"
									>
										<div className="min-w-0">
											<p className="font-medium">{student.name}</p>
											<p className="text-sm text-muted-foreground">
												Início {formatDate(student.startDate)}
												{student.endDate
													? ` · Fim ${formatDate(student.endDate)}`
													: " · Em andamento"}
											</p>
										</div>
										<EnrollmentStatusBadge status={student.status} />
									</li>
								))}
							</ul>
						)}
					</PageSection>
				</TabsContent>

				<TabsContent value="ofertas" className="space-y-4">
					<ClassOffersPanel classId={id} turmaName={data?.turma.name} />
				</TabsContent>

				<TabsContent value="reunioes" className="space-y-4">
					<PageSection
						title="Reuniões da turma"
						description="Conselhos de classe vinculados a esta turma."
					>
						{isLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-16 w-full" />
							</div>
						) : meetings.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhuma reunião vinculada a esta turma.
							</p>
						) : (
							<ul aria-label="Reuniões da turma" className="grid gap-2">
								{meetings.map((meeting) => (
									<li
										key={meeting.id}
										className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/40 p-3"
									>
										<div className="min-w-0">
											<Link
												to="/meetings/$meetingId"
												params={{ meetingId: meeting.id }}
												className="font-medium hover:underline"
											>
												{meeting.title}
											</Link>
											<p className="text-sm text-muted-foreground">
												{meeting.heldAt
													? `Realizada em ${formatDateTime(meeting.heldAt)}`
													: "Sem data"}
											</p>
										</div>
										<MeetingStatusBadge status={meeting.status} />
									</li>
								))}
							</ul>
						)}
					</PageSection>
				</TabsContent>

				<TabsContent value="linha-do-tempo" className="space-y-4">
					<PageSection
						title="Linha do tempo"
						description="Eventos da turma em ordem cronológica: reuniões, registros e relatos."
					>
						<HistorySearchForm
							hideStudentFilters
							onSubmit={handleSearch}
							onReset={() => setFilters({})}
						/>
						<HistoryEventList
							events={events}
							isLoading={isLoading}
							isError={isError}
							emptyMessage="Nenhum evento no histórico da turma."
							turmaNome={data?.turma.name}
						/>
					</PageSection>
				</TabsContent>
			</Tabs>
		</PageShell>
	);
}
