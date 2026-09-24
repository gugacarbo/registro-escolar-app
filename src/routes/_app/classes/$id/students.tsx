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
import { DataTable } from "#/components/data-table";
import { EditClassDialog } from "#/components/classes/edit-class-dialog";
import { EnrollmentDialog } from "#/components/enrollments/enrollment-dialog";
import { EnrollmentStatusBadge } from "#/components/enrollments/enrollment-status-badge";
import {
	HistorySearchForm,
	type HistorySearchValues,
} from "#/components/history/history-search-form";
import { MeetingStatusBadge } from "#/components/meetings/meeting-status-badge";
import { ClassOffersPanel } from "#/components/offers/class-offers-panel";
import { Badge } from "#/components/ui/badge";
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
import { PageHeader, PageSection, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import type { HistoryFilters } from "#/hooks/history/use-history";
import { useClassHistory } from "#/hooks/history/use-history";
import { useOffers } from "#/hooks/offers/use-offers";
import type {
	ClassHistoryMeeting,
	ClassHistoryStudent,
	HistoryEvent,
} from "#/lib/history/types";

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

const EVENT_LABELS: Record<string, string> = {
	matricula: "Matrícula",
	encerramento_matricula: "Encerramento",
	reuniao: "Reunião",
	registro: "Registro",
	relato_geral: "Relato geral",
	status_reuniao: "Status na reunião",
};

function formatEventDetail(event: HistoryEvent) {
	const context: string[] = [];
	if (event.studentName) {
		context.push(`Estudante: ${event.studentName}`);
	}
	if (event.reuniaoTitulo) {
		context.push(`Reunião: ${event.reuniaoTitulo}`);
	}
	if (event.interno) {
		context.push("Registro interno");
	}
	return { text: event.texto, context: context.join(" · ") };
}

function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return rows.slice(start, start + pageSize);
}

const meetingColumns = [
	{
		header: "Título",
		cell: (meeting: ClassHistoryMeeting) => (
			<Link
				to="/meetings/$meetingId"
				params={{ meetingId: meeting.id }}
				className="font-medium hover:underline"
			>
				{meeting.title}
			</Link>
		),
	},
	{
		header: "Data",
		cell: (meeting: ClassHistoryMeeting) =>
			meeting.heldAt ? formatDateTime(meeting.heldAt) : "Sem data",
	},
	{
		header: "Status",
		align: "right" as const,
		cell: (meeting: ClassHistoryMeeting) => (
			<MeetingStatusBadge status={meeting.status} />
		),
	},
];

const timelineColumns = [
	{
		header: "Data",
		cell: (event: HistoryEvent) => formatDateTime(event.data),
	},
	{
		header: "Evento",
		cell: (event: HistoryEvent) => (
			<Badge variant="outline">{EVENT_LABELS[event.tipo] ?? event.tipo}</Badge>
		),
	},
	{
		header: "Detalhe",
		cell: (event: HistoryEvent) => {
			const { text, context } = formatEventDetail(event);
			return (
				<div className="min-w-0">
					{text && <p className="font-normal">{text}</p>}
					{context && (
						<p className="text-xs text-muted-foreground">{context}</p>
					)}
					{!text && !context && (
						<span className="text-muted-foreground">—</span>
					)}
				</div>
			);
		},
	},
];
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

const studentColumns = [
	{
		header: "Nome",
		cell: (student: ClassHistoryStudent) => (
			<span className="font-medium">{student.name}</span>
		),
	},
	{
		header: "Início",
		cell: (student: ClassHistoryStudent) => formatDate(student.startDate),
	},
	{
		header: "Fim",
		cell: (student: ClassHistoryStudent) =>
			student.endDate ? (
				formatDate(student.endDate)
			) : (
				<span className="text-muted-foreground">Em andamento</span>
			),
	},
	{
		header: "Status",
		align: "right" as const,
		cell: (student: ClassHistoryStudent) => (
			<EnrollmentStatusBadge status={student.status} />
		),
	},
];

export default function ClassStudentsPage() {
	const { id } = Route.useParams();
	const [filters, setFilters] = useState<HistoryFilters>({});
	const [activeTab, setActiveTab] = useState("estudantes");
	const [studentsPage, setStudentsPage] = useState(1);
	const [studentsPageSize, setStudentsPageSize] = useState(10);
	const [meetingsPage, setMeetingsPage] = useState(1);
	const [meetingsPageSize, setMeetingsPageSize] = useState(10);
	const [timelinePage, setTimelinePage] = useState(1);
	const [timelinePageSize, setTimelinePageSize] = useState(10);
	const { data, isLoading, isError } = useClassHistory(id, filters);
	const { data: offers } = useOffers(id);

	const students = data?.estudantes ?? [];
	const meetings = data?.reunioes ?? [];
	const events = data?.eventos ?? [];
	const orderedStudents = orderStudents(students);
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
		setTimelinePage(1);
	}

	function handleResetFilters() {
		setFilters({});
		setTimelinePage(1);
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
					data ? (
						<div className="flex flex-wrap items-center gap-2">
							<EditClassDialog
								classRow={data.turma}
								trigger={<Button variant="outline">Editar turma</Button>}
							/>
							<EnrollmentDialog
								defaultTurmaId={id}
								turmaName={data?.turma.name}
								excludedStudentIds={students
									.filter((student) => student.status === "ativa")
									.map((student) => student.studentId)}
								trigger={<Button variant="secondary">Matricular alunos</Button>}
							/>
						</div>
					) : undefined
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
						) : (
							<DataTable
								columns={studentColumns}
								rows={paginate(
									orderedStudents,
									studentsPage,
									studentsPageSize,
								)}
								getRowKey={(student) =>
									`${student.studentId}-${student.startDate}`
								}
								total={orderedStudents.length}
								page={studentsPage}
								pageSize={studentsPageSize}
								onPageChange={setStudentsPage}
								onPageSizeChange={(size) => {
									setStudentsPageSize(size);
									setStudentsPage(1);
								}}
								isLoading={isLoading}
								isError={isError}
								ariaLabel="Estudantes vinculados"
								emptyTitle="Nenhum estudante vinculado."
								emptyDescription="Matricule um estudante nesta turma para acompanhar os vínculos."
								emptyAction={
									<EnrollmentDialog
										defaultTurmaId={id}
										turmaName={data?.turma.name}
										trigger={
											<Button variant="outline" size="sm">
												Matricular estudantes
											</Button>
										}
									/>
								}
							/>
						)}
					</PageSection>
				</TabsContent>

				<TabsContent value="ofertas" className="space-y-4">
					<ClassOffersPanel classId={id} turmaName={data?.turma.name} />
				</TabsContent>

				<TabsContent value="reunioes" className="space-y-4">
					<PageSection title="Reuniões da turma">
						<DataTable
							columns={meetingColumns}
							rows={paginate(meetings, meetingsPage, meetingsPageSize)}
							getRowKey={(meeting) => meeting.id}
							total={meetings.length}
							page={meetingsPage}
							pageSize={meetingsPageSize}
							onPageChange={setMeetingsPage}
							onPageSizeChange={(size) => {
								setMeetingsPageSize(size);
								setMeetingsPage(1);
							}}
							isLoading={isLoading}
							isError={isError}
							ariaLabel="Reuniões da turma"
							emptyTitle="Nenhuma reunião vinculada a esta turma."
						/>
					</PageSection>
				</TabsContent>

				<TabsContent value="linha-do-tempo" className="space-y-4">
					<PageSection title="Linha do tempo">
						<HistorySearchForm
							hideStudentFilters
							onSubmit={handleSearch}
							onReset={handleResetFilters}
						/>
						<DataTable
							columns={timelineColumns}
							rows={paginate(events, timelinePage, timelinePageSize)}
							getRowKey={(event) => event.id}
							total={events.length}
							page={timelinePage}
							pageSize={timelinePageSize}
							onPageChange={setTimelinePage}
							onPageSizeChange={(size) => {
								setTimelinePageSize(size);
								setTimelinePage(1);
							}}
							isLoading={isLoading}
							isError={isError}
							ariaLabel="Linha do tempo da turma"
							emptyTitle="Nenhum evento no histórico da turma."
						/>
					</PageSection>
				</TabsContent>
			</Tabs>
		</PageShell>
	);
}
