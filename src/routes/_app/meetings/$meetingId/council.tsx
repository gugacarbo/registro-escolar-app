import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	FileTextIcon,
	PlusIcon,
	SearchIcon,
	Users2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GeneralReportDialog } from "#/components/meetings/general-report-dialog";
import { GeneralReportForm } from "#/components/meetings/general-report-form";
import {
	RecordForm,
	type RecordFormSubmitValues,
} from "#/components/meetings/record-form";
import { TransitionButtons } from "#/components/meetings/transition-buttons";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { PageHeader, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	useCreateGeneralReport,
	useGeneralReports,
	useUpdateGeneralReport,
} from "#/hooks/general-reports/use-general-reports";
import { useMeeting } from "#/hooks/meetings/use-meeting";
import { useMeetingClassStudents } from "#/hooks/meetings/use-meeting-class-students";
import { useMeetingClasses } from "#/hooks/meetings/use-meeting-classes";
import {
	useCreateLinkedRecord,
	useMeetingStudentRecords,
	useSetRecordInclusion,
	useUpdateLinkedRecord,
} from "#/hooks/records/use-records";
import type { MeetingStatus } from "#/lib/meetings/schema";
import { canEditLinkedRecord } from "#/lib/meetings/transitions";
import type { MeetingStudentRecord } from "#/lib/records/types";

export const Route = createFileRoute("/_app/meetings/$meetingId/council")({
	component: CouncilPage,
});

type StudentOption = {
	studentId: string;
	name: string;
	registrationNumber: string | null;
};

function formatDate(value: string) {
	return new Date(value).toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export default function CouncilPage() {
	const { meetingId } = Route.useParams();
	const { data: meeting, isLoading: isLoadingMeeting } = useMeeting(meetingId);
	const { data: meetingClasses = [], isLoading: isLoadingClasses } =
		useMeetingClasses(meetingId);
	const [selectedClassId, setSelectedClassId] = useState("");
	const activeClassId = selectedClassId || meetingClasses[0]?.classId || "";
	const activeClassName =
		meetingClasses.find((link) => link.classId === activeClassId)?.class
			?.name ?? activeClassId;
	const {
		data: classStudents,
		isLoading: isLoadingStudents,
		isError: isErrorStudents,
	} = useMeetingClassStudents(meetingId, activeClassId);
	const [selectedStudentId, setSelectedStudentId] = useState("");
	const [studentSearch, setStudentSearch] = useState("");
	const students = classStudents?.students ?? [];
	const recordCounts = classStudents?.counters;
	const filteredStudents = useMemo(() => {
		const query = studentSearch.trim().toLowerCase();
		if (!query) return students;
		return students.filter(
			(student) =>
				student.name.toLowerCase().includes(query) ||
				(student.registrationNumber || "").toLowerCase().includes(query),
		);
	}, [students, studentSearch]);
	const selectedStudent = students.find(
		(student) => student.studentId === selectedStudentId,
	);
	const {
		data: recordsResult,
		isLoading: isLoadingRecords,
		isError: isErrorRecords,
	} = useMeetingStudentRecords(meetingId, selectedStudent?.studentId ?? "");
	const createRecord = useCreateLinkedRecord(meetingId);
	const updateRecord = useUpdateLinkedRecord(meetingId);
	const setInclusion = useSetRecordInclusion(meetingId);
	const {
		data: generalReports = [],
		isLoading: isLoadingReports,
		isError: isErrorReports,
	} = useGeneralReports(meetingId);
	const createGeneralReport = useCreateGeneralReport(meetingId);
	const updateGeneralReport = useUpdateGeneralReport(meetingId);
	const [serverError, setServerError] = useState<string | null>(null);
	const [editingRecord, setEditingRecord] = useState<string | null>(null);
	const [editingReport, setEditingReport] = useState<string | null>(null);
	const [recordDialogOpen, setRecordDialogOpen] = useState(false);
	const [tab, setTab] = useState("registros");
	const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
	const canEdit =
		!!meeting && canEditLinkedRecord(meeting.status as MeetingStatus);

	const records = recordsResult?.records ?? [];
	const recordsInMinutes = records.filter((r) => r.includeInMinutes).length;

	function selectStudent(studentId: string) {
		setSelectedStudentId(studentId);
		setEditingRecord(null);
		setEditingReport(null);
		setTab("registros");
	}

	/** P2: ao trocar de turma, foca o próximo pendente (ou o primeiro). */
	function selectClass(classId: string) {
		setSelectedClassId(classId);
		setStudentSearch("");
		setEditingRecord(null);
		setEditingReport(null);
		setTab("registros");
		let next = "";
		if (classStudents && classId === activeClassId) {
			next =
				classStudents.nextPendingStudentId ||
				classStudents.students[0]?.studentId ||
				"";
		}
		setPendingStudentId(next);
		setSelectedStudentId(next);
	}

	async function handleCreate(values: RecordFormSubmitValues) {
		setServerError(null);
		try {
			await createRecord.mutateAsync({
				studentId: selectedStudent!.studentId,
				texto: values.texto,
				categoriaId: values.categoriaId,
				componenteId: values.componenteId,
				origemId: values.origemId,
				incluirNaAta: values.incluirNaAta,
			});
			toast.success("Registro criado");
			setRecordDialogOpen(false);
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	async function handleUpdate(values: RecordFormSubmitValues) {
		setServerError(null);
		try {
			await updateRecord.mutateAsync({
				studentId: selectedStudent!.studentId,
				recordId: editingRecord!,
				texto: values.texto,
				categoriaId: values.categoriaId,
				componenteId: values.componenteId,
				origemId: values.origemId,
				incluirNaAta: values.incluirNaAta,
			});
			toast.success("Registro atualizado");
			setEditingRecord(null);
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	async function handleCreateReport(values: {
		texto: string;
		origemId: string | null;
		incluirNaAta: boolean;
	}) {
		setServerError(null);
		try {
			await createGeneralReport.mutateAsync(values);
			toast.success("Relato criado");
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
			return false;
		}
	}

	async function handleUpdateReport(values: {
		texto: string;
		origemId: string | null;
		incluirNaAta: boolean;
	}) {
		setServerError(null);
		try {
			await updateGeneralReport.mutateAsync({
				reportId: editingReport!,
				...values,
			});
			toast.success("Relato atualizado");
			setEditingReport(null);
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	async function handleInclusion(
		record: MeetingStudentRecord,
		include: boolean,
	) {
		setServerError(null);
		try {
			await setInclusion.mutateAsync({
				studentId: selectedStudent!.studentId,
				record,
				incluir: include,
			});
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	return (
		<PageShell className="space-y-4">
			<div className="sticky top-0 z-10 -mx-2 border-b bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<Link
					to="/meetings/$meetingId"
					params={{ meetingId }}
					className="mb-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeftIcon className="size-3.5" />
					Voltar para detalhes da reunião
				</Link>
				<PageHeader
					className="border-0 pb-0"
					title={
						meeting?.title ?? (isLoadingMeeting ? "Carregando..." : "Reunião")
					}
					actions={
						meeting && (
							<TransitionButtons
								meetingId={meeting.id}
								status={meeting.status}
							/>
						)
					}
				/>
			</div>

			{meetingClasses.length > 0 && (
				<div data-testid="council-class-tabs" className="min-w-0">
					<Card className="gap-0 p-2">
						<span
							data-testid="council-class-label"
							className="absolute -top-2 left-5 z-10 bg-card px-1.5 text-xs leading-none font-semibold tracking-wide text-muted-foreground"
						>
							Turmas
						</span>
						<Tabs value={activeClassId} onValueChange={selectClass}>
							<TabsList
								aria-label="Turmas da reunião"
								className="w-full max-w-full justify-start overflow-hidden"
							>
								{meetingClasses.map((link) => (
									<TabsTrigger
										key={link.id}
										value={link.classId}
										className="flex-none px-4"
									>
										{link.class?.name ?? link.classId}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</Card>
				</div>
			)}

			<div
				data-testid="council-layout"
				className="grid items-start gap-4 md:grid-cols-[minmax(18rem,0.34fr)_minmax(0,1fr)]"
			>
				<div data-testid="council-students-panel" className="min-w-0">
					<Card className="md:sticky md:top-4">
						<CardHeader>
							<CardTitle>Estudantes</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{isLoadingClasses && <Skeleton className="h-10 w-full" />}
							{!isLoadingClasses && meetingClasses.length === 0 && (
								<p className="text-sm text-muted-foreground">
									Nenhuma turma vinculada a esta reunião.
								</p>
							)}
							{activeClassId && (
								<div className="space-y-2 border-t pt-4">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<h3 className="text-sm font-semibold">
											Estudantes da turma {activeClassName}
										</h3>
										{recordCounts && recordCounts.total > 0 && (
											<p
												className="text-xs text-muted-foreground"
												role="status"
											>
												{recordCounts.concluido} de {recordCounts.total}{" "}
												concluídos (
												{Math.round(
													(recordCounts.concluido / recordCounts.total) * 100,
												)}
												%)
											</p>
										)}
									</div>
									{recordCounts && recordCounts.total > 0 && (
										<div
											role="progressbar"
											aria-valuenow={Math.round(
												(recordCounts.concluido / recordCounts.total) * 100,
											)}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`Progresso da turma ${activeClassName}`}
											className="h-2 w-full rounded bg-muted"
										>
											<div
												className="h-2 rounded bg-primary transition-all"
												style={{
													width: `${Math.round((recordCounts.concluido / recordCounts.total) * 100)}%`,
												}}
											/>
										</div>
									)}
									{students.length > 5 && (
										<div className="relative">
											<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												value={studentSearch}
												onChange={(event) =>
													setStudentSearch(event.target.value)
												}
												placeholder="Buscar estudante por nome ou matrícula..."
												aria-label="Buscar estudante"
												className="pl-9"
											/>
										</div>
									)}
									{activeClassId && isLoadingStudents && (
										<p>Carregando estudantes...</p>
									)}
									{activeClassId && isErrorStudents && (
										<p role="alert" className="text-sm text-muted-foreground">
											Não foi possível carregar os estudantes desta turma.
										</p>
									)}
									{students.length > 0 && filteredStudents.length === 0 && (
										<p className="text-sm text-muted-foreground">
											Nenhum estudante encontrado para “{studentSearch}”.
										</p>
									)}
									{filteredStudents.length > 0 && (
										<div
											data-testid="student-list-scroll"
											className="student-list-scroll max-h-96 overflow-y-auto pr-1"
										>
											<ul
												className="grid min-w-0 gap-2"
												aria-label="Estudantes da turma"
											>
												{filteredStudents.map((student: StudentOption) => {
													const isActive =
														selectedStudent?.studentId === student.studentId;
													const isNextPending =
														(pendingStudentId ??
															classStudents?.nextPendingStudentId) ===
														student.studentId;
													return (
														<li key={student.studentId} className="min-w-0">
															<Button
																variant="ghost"
																type="button"
																onClick={() => selectStudent(student.studentId)}
																aria-pressed={isActive}
																aria-label={`Selecionar ${student.name}`}
																className={`flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border p-2 text-left transition-colors hover:bg-accent ${isActive ? "border-primary ring-1 ring-primary" : ""}`}
															>
																<Avatar className="size-8 shrink-0">
																	<AvatarFallback className="text-xs font-medium">
																		{initials(student.name)}
																	</AvatarFallback>
																</Avatar>
																<span className="min-w-0 flex-1">
																	<span className="block truncate text-sm font-medium">
																		{student.name}
																	</span>
																	{student.registrationNumber && (
																		<span className="block truncate text-xs leading-tight text-muted-foreground/75">
																			Matrícula {student.registrationNumber}
																		</span>
																	)}
																	{isNextPending && (
																		<span className="block truncate text-xs font-medium text-primary">
																			Próximo pendente
																		</span>
																	)}
																</span>
																{isActive && (
																	<Badge variant="default">Ativo</Badge>
																)}
															</Button>
														</li>
													);
												})}
											</ul>
										</div>
									)}
									{activeClassId &&
										students.length === 0 &&
										!isLoadingStudents && (
											<p className="text-sm text-muted-foreground">
												Nenhum estudante vinculado a esta turma na data da
												reunião.
											</p>
										)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div data-testid="council-records-panel" className="min-w-0">
					{activeClassId &&
						!isLoadingStudents &&
						students.length > 0 &&
						!selectedStudent && (
							<Card>
								<CardContent className="p-10">
									<Empty className="border-0">
										<EmptyHeader>
											<EmptyMedia variant="icon">
												<Users2Icon />
											</EmptyMedia>
											<EmptyTitle>Nenhum estudante selecionado</EmptyTitle>
											<EmptyDescription>
												Escolha um estudante na lista acima para ver os
												registros e relatos.
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								</CardContent>
							</Card>
						)}

					{selectedStudent && (
						<Tabs value={tab} onValueChange={setTab}>
							<TabsList aria-label="Conteúdo da reunião">
								<TabsTrigger value="registros">
									Registros de {selectedStudent.name} ({records.length})
								</TabsTrigger>
								<TabsTrigger value="relatos">
									Relatos gerais ({generalReports.length})
								</TabsTrigger>
							</TabsList>

							<TabsContent value="registros">
								<Card>
									<CardHeader>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div>
												<CardTitle id="records-title">
													Registros de {selectedStudent.name}
												</CardTitle>
												<CardDescription>
													{selectedStudent.registrationNumber
														? `Matrícula ${selectedStudent.registrationNumber} · `
														: ""}
													{records.length} registro(s) · {recordsInMinutes} na
													ata
												</CardDescription>
											</div>
											{!canEdit ? (
												<p
													className="text-sm text-muted-foreground"
													role="status"
												>
													Reunião encerrada — reabra para editar registros
													vinculados.
												</p>
											) : (
												<Dialog
													open={recordDialogOpen}
													onOpenChange={setRecordDialogOpen}
												>
													<DialogTrigger asChild>
														<Button type="button">
															<PlusIcon className="size-4" />
															Novo registro
														</Button>
													</DialogTrigger>
													<DialogContent className="max-h-[90vh] overflow-y-auto">
														<DialogHeader>
															<DialogTitle>
																Novo registro de {selectedStudent.name}
															</DialogTitle>
															<DialogDescription>
																Descreva o fato observado. O rascunho é salvo
																automaticamente neste dispositivo.
															</DialogDescription>
														</DialogHeader>
														<RecordForm
															meetingId={meetingId}
															onSubmit={handleCreate}
															submitLabel="Adicionar registro"
															disabled={!canEdit || createRecord.isPending}
															draftKey={`${meetingId}:${selectedStudent.studentId}`}
														/>
													</DialogContent>
												</Dialog>
											)}
										</div>
									</CardHeader>
									<CardContent className="space-y-3">
										{isLoadingRecords && <Skeleton className="h-20 w-full" />}
										{isErrorRecords && (
											<p role="alert" className="text-sm text-muted-foreground">
												Não foi possível carregar os registros.
											</p>
										)}
										{recordsResult && records.length === 0 && (
											<Empty>
												<EmptyHeader>
													<EmptyMedia variant="icon">
														<FileTextIcon />
													</EmptyMedia>
													<EmptyTitle>
														Nenhum registro para este estudante
													</EmptyTitle>
													<EmptyDescription>
														Registre observações feitas na reunião para compor o
														histórico e a ata.
													</EmptyDescription>
												</EmptyHeader>
												{canEdit && (
													<EmptyContent>
														<Button
															type="button"
															onClick={() => setRecordDialogOpen(true)}
														>
															<PlusIcon className="size-4" />
															Adicionar o primeiro registro
														</Button>
													</EmptyContent>
												)}
											</Empty>
										)}
										<ul className="space-y-2">
											{records.map((record) => (
												<li key={record.id} className="rounded border p-3">
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="min-w-0 flex-1 space-y-1">
															<div className="flex flex-wrap items-center gap-2">
																<Badge
																	variant={
																		record.scope === "vinculado"
																			? "default"
																			: "secondary"
																	}
																>
																	{record.scope === "vinculado"
																		? "Da reunião"
																		: "Histórico"}
																</Badge>
																<span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
																	<Switch
																		checked={record.includeInMinutes}
																		disabled={
																			!canEdit ||
																			record.scope !== "contexto" ||
																			setInclusion.isPending
																		}
																		onCheckedChange={(checked) =>
																			void handleInclusion(record, !!checked)
																		}
																		aria-label={`${record.includeInMinutes ? "Remover" : "Incluir"} registro "${record.texto}" na ata`}
																	/>
																	{record.includeInMinutes
																		? "Na ata"
																		: "Interno"}
																</span>
															</div>
															<p>{record.texto}</p>
															<p className="text-xs text-muted-foreground">
																{formatDate(record.createdAt)}
															</p>
														</div>
														<div className="flex flex-wrap gap-2">
															{record.scope === "vinculado" && (
																<Button
																	type="button"
																	size="sm"
																	variant="outline"
																	disabled={!canEdit || updateRecord.isPending}
																	onClick={() => setEditingRecord(record.id)}
																>
																	{editingRecord === record.id
																		? "Editando"
																		: "Editar"}
																</Button>
															)}
														</div>
													</div>
													{editingRecord === record.id &&
														record.scope === "vinculado" && (
															<div className="mt-3 border-t pt-3">
																<RecordForm
																	meetingId={meetingId}
																	defaultValues={{
																		texto: record.texto,
																		categoriaId: record.categoriaId ?? "",
																		componenteId: record.componentId ?? "",
																		origemId: record.originId ?? "",
																		incluirNaAta: record.includeInMinutes,
																	}}
																	onSubmit={handleUpdate}
																	submitLabel="Salvar registro"
																	disabled={!canEdit || updateRecord.isPending}
																/>
															</div>
														)}
												</li>
											))}
										</ul>
										{serverError && (
											<p className="text-sm text-destructive">{serverError}</p>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="relatos">
								<Card>
									<CardHeader>
										<CardTitle id="general-reports-title">
											Relatos gerais
										</CardTitle>
										<CardDescription>
											Observações sobre a turma ou a reunião como um todo ·{" "}
											{generalReports.length} relato(s)
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-3">
										{isLoadingReports && <p>Carregando relatos...</p>}
										{isErrorReports && (
											<p role="alert" className="text-sm text-muted-foreground">
												Não foi possível carregar os relatos gerais.
											</p>
										)}
										{!isLoadingReports && generalReports.length === 0 && (
											<Empty>
												<EmptyHeader>
													<EmptyMedia variant="icon">
														<FileTextIcon />
													</EmptyMedia>
													<EmptyTitle>Nenhum relato geral</EmptyTitle>
													<EmptyDescription>
														Use relatos gerais para observações que não
														pertencem a um estudante específico.
													</EmptyDescription>
												</EmptyHeader>
											</Empty>
										)}
										<ul className="space-y-2">
											{generalReports.map((report) => (
												<li key={report.id} className="rounded border p-3">
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="min-w-0 flex-1">
															<p>{report.texto}</p>
															<p className="text-xs text-muted-foreground">
																{new Date(report.createdAt).toLocaleString(
																	"pt-BR",
																)}
																{report.includeInMinutes
																	? " · Na ata"
																	: " · Interno"}
															</p>
														</div>
														<Button
															type="button"
															size="sm"
															variant="outline"
															disabled={
																!canEdit || updateGeneralReport.isPending
															}
															onClick={() => setEditingReport(report.id)}
														>
															Editar
														</Button>
													</div>
													{editingReport === report.id && (
														<div className="mt-3 border-t pt-3">
															<GeneralReportForm
																meetingId={meetingId}
																defaultValues={{
																	texto: report.texto,
																	origemId: report.originId ?? "",
																	incluirNaAta: report.includeInMinutes,
																}}
																onSubmit={handleUpdateReport}
																submitLabel="Salvar relato"
																disabled={
																	!canEdit || updateGeneralReport.isPending
																}
															/>
														</div>
													)}
												</li>
											))}
										</ul>
										<div className="border-t pt-3">
											<GeneralReportDialog
												meetingId={meetingId}
												onSubmit={handleCreateReport}
												disabled={!canEdit || createGeneralReport.isPending}
												draftKey={meetingId}
												onOpenChange={(open) => {
													if (open) setServerError(null);
												}}
											/>
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					)}

					{selectedStudent && serverError && tab !== "registros" && (
						<p className="text-sm text-destructive">{serverError}</p>
					)}

					{selectedStudent && !canEdit && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button type="button" variant="outline">
									Por que não consigo editar?
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Edição bloqueada pelo status
									</AlertDialogTitle>
									<AlertDialogDescription>
										Reunião encerrada — reabra para editar registros vinculados.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Entendi</AlertDialogCancel>
									<AlertDialogAction asChild>
										<span>OK</span>
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</div>
		</PageShell>
	);
}
