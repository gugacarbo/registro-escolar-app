import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircleIcon,
	ArrowRightIcon,
	BookOpenIcon,
	CalendarIcon,
	CheckCircle2Icon,
	ClockIcon,
	DownloadIcon,
	FileTextIcon,
	GraduationCapIcon,
	PencilIcon,
	PlusIcon,
	UsersIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EditMeetingDialog } from "#/components/meetings/edit-meeting-dialog";
import { MeetingStatusBadge } from "#/components/meetings/meeting-status-badge";
import { TransitionButtons } from "#/components/meetings/transition-buttons";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
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
	CardFooter,
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
import { EntitySelect } from "#/components/ui/entity-select";
import { PageHeader, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { fetchRolesPage, fetchStaffPage } from "#/hooks/entity-fetchers";
import { useGeneralReports } from "#/hooks/general-reports/use-general-reports";
import { useAddParticipant } from "#/hooks/meetings/use-add-participant";
import { useMeeting } from "#/hooks/meetings/use-meeting";
import { useMeetingClasses } from "#/hooks/meetings/use-meeting-classes";
import { useParticipants } from "#/hooks/meetings/use-participants";
import { useGenerateMinute } from "#/hooks/minutes/use-generate-minute";
import { useMinutePreview } from "#/hooks/minutes/use-minute-preview";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import { useMinuteVersions } from "#/hooks/minutes/use-minute-versions";
import { useAsyncOptions } from "#/hooks/use-async-options";
import type { MeetingStatus } from "#/lib/meetings/schema";
import { canEditLinkedRecord } from "#/lib/meetings/transitions";

export const Route = createFileRoute("/_app/meetings/$meetingId/")({
	component: MeetingDetailPage,
});

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "Não informada";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Não informada";
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
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

export default function MeetingDetailPage() {
	const { meetingId } = Route.useParams();
	const { data: meeting, isLoading: isLoadingMeeting } = useMeeting(meetingId);
	const { data: meetingClasses = [], isLoading: isLoadingClasses } =
		useMeetingClasses(meetingId);
	const { data: participants = [], isLoading: isLoadingParticipants } =
		useParticipants(meetingId);
	const { data: generalReports = [] } = useGeneralReports(meetingId);
	const { data: templates = [] } = useMinuteTemplates();

	const preview = useMinutePreview(meetingId);
	const versions = useMinuteVersions(meetingId);
	const generate = useGenerateMinute(meetingId);
	const addParticipant = useAddParticipant(meetingId);

	const [activeTab, setActiveTab] = useState("visao-geral");

	// Participantes Selects
	const [staffSearch, setStaffSearch] = useState("");
	const [roleSearch, setRoleSearch] = useState("");
	const { data: staffResult, isLoading: isLoadingStaff } = useAsyncOptions({
		queryKey: ["meeting-detail-participants", "staff"],
		search: staffSearch,
		fetchPage: fetchStaffPage,
		select: (member) => ({ id: member.id, name: member.name }),
	});
	const staff = staffResult?.options ?? [];
	const staffById = useMemo(
		() => new Map(staff.map((member) => [member.id, member.name])),
		[staff],
	);

	const { data: rolesResult, isLoading: isLoadingRoles } = useAsyncOptions({
		queryKey: ["meeting-detail-participants", "roles"],
		search: roleSearch,
		fetchPage: fetchRolesPage,
		select: (role) => ({ id: role.id, name: role.name }),
	});
	const roles = rolesResult?.options ?? [];
	const roleById = useMemo(
		() => new Map(roles.map((role) => [role.id, role.name])),
		[roles],
	);

	const [staffId, setStaffId] = useState("");
	const [roleId, setRoleId] = useState("");
	const [participantError, setParticipantError] = useState<string | null>(null);

	const canEdit =
		!!meeting && canEditLinkedRecord(meeting.status as MeetingStatus);
	const isDraft = meeting?.status === "draft";
	const activeTemplate = templates.find((t) => t.id === meeting?.templateId);

	async function handleAddParticipant() {
		setParticipantError(null);
		if (!staffId || !roleId) {
			setParticipantError("Selecione o servidor e o papel");
			return;
		}
		try {
			await addParticipant.mutateAsync({ staffId, roleId });
			setStaffId("");
			setRoleId("");
		} catch (error) {
			if (error instanceof Error) {
				setParticipantError(error.message);
			}
		}
	}

	if (isLoadingMeeting) {
		return (
			<PageShell>
				<div className="space-y-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-16 w-full" />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Skeleton className="h-28 w-full" />
						<Skeleton className="h-28 w-full" />
						<Skeleton className="h-28 w-full" />
						<Skeleton className="h-28 w-full" />
					</div>
				</div>
			</PageShell>
		);
	}

	if (!meeting) {
		return (
			<PageShell>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<AlertCircleIcon />
						</EmptyMedia>
						<EmptyTitle>Reunião não encontrada</EmptyTitle>
						<EmptyDescription>
							A reunião solicitada não existe ou foi removida.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Link to="/meetings">
							<Button variant="outline">Voltar para a lista de reuniões</Button>
						</Link>
					</EmptyContent>
				</Empty>
			</PageShell>
		);
	}

	return (
		<PageShell>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/meetings">Reuniões</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{meeting.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				eyebrow="Conselho de classe"
				title={meeting.title}
				description={
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
						<MeetingStatusBadge status={meeting.status} />
						<span className="flex items-center gap-1.5 text-muted-foreground">
							<CalendarIcon className="size-4 shrink-0 text-primary/70" />
							Data:{" "}
							<strong className="font-medium text-foreground">
								{formatDate(meeting.heldAt)}
							</strong>
						</span>
						{activeTemplate && (
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<FileTextIcon className="size-4 shrink-0 text-primary/70" />
								Modelo de ata:{" "}
								<strong className="font-medium text-foreground">
									{activeTemplate.name}
								</strong>
							</span>
						)}
					</div>
				}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						{(meeting.status === "draft" || meeting.status === "reopened") && (
							<EditMeetingDialog
								meeting={meeting}
								trigger={
									<Button variant="outline" size="sm">
										<PencilIcon className="mr-1.5 size-3.5" />
										Editar dados
									</Button>
								}
							/>
						)}
						<TransitionButtons meetingId={meeting.id} status={meeting.status} />
						<Link to="/meetings/$meetingId/council" params={{ meetingId }}>
							<Button className="gap-2 shadow-xs">
								<UsersIcon className="size-4" />
								Conselho
								<ArrowRightIcon className="size-4" />
							</Button>
						</Link>
					</div>
				}
			/>

			{meeting.status === "finished" && (
				<div
					role="status"
					className="flex items-center gap-2 rounded-lg border border-primary/20 bg-secondary/80 p-3 text-sm text-foreground shadow-xs"
				>
					<CheckCircle2Icon className="size-4 shrink-0 text-primary" />
					<span>Reunião finalizada — reabra para editar</span>
				</div>
			)}

			{meeting.status === "draft" && (
				<div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-900 shadow-xs dark:text-amber-200">
					<ClockIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
					<span>
						Reunião em rascunho. Revise as turmas e a equipe de participantes
						antes de iniciar os trabalhos do conselho.
					</span>
				</div>
			)}

			{meeting.status === "reopened" && (
				<div className="flex items-center gap-2.5 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-900 shadow-xs dark:text-orange-200">
					<AlertCircleIcon className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
					<span>
						Reunião reaberta para ajustes. Ao finalizar os acertos nos
						registros, lembre-se de atualizar a ata e concluir a sessão.
					</span>
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
							Turmas vinculadas
							<GraduationCapIcon className="size-4 text-primary/60" />
						</CardDescription>
						<CardTitle className="text-2xl font-bold">
							{isLoadingClasses ? "..." : meetingClasses.length}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						{meetingClasses.length > 0 ? (
							<span className="line-clamp-1">
								{meetingClasses
									.map((c) => c.class?.name ?? c.classId)
									.join(", ")}
							</span>
						) : (
							"Nenhuma turma vinculada"
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
							Equipe participante
							<UsersIcon className="size-4 text-primary/60" />
						</CardDescription>
						<CardTitle className="text-2xl font-bold">
							{isLoadingParticipants ? "..." : participants.length}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						{participants.length === 1
							? "1 servidor registrado"
							: `${participants.length} servidores registrados`}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
							Relatos gerais
							<BookOpenIcon className="size-4 text-primary/60" />
						</CardDescription>
						<CardTitle className="text-2xl font-bold">
							{generalReports.length}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						Observações gerais da reunião
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
							Ata do conselho
							<FileTextIcon className="size-4 text-primary/60" />
						</CardDescription>
						<CardTitle className="text-2xl font-bold">
							{preview.data?.approvalStatus === "aprovada"
								? "Aprovada"
								: preview.data
									? "Em elaboração"
									: "Pendente"}
						</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground">
						{versions.data?.length
							? `${versions.data.length} versão(ões) gerada(s)`
							: "Nenhuma versão emitida"}
					</CardContent>
				</Card>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-4"
			>
				<div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
					<div className="min-w-0 max-w-full overflow-x-auto">
						<TabsList>
							<TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
							<TabsTrigger value="turmas">
								Turmas ({meetingClasses.length})
							</TabsTrigger>
							<TabsTrigger value="participantes">
								Participantes ({participants.length})
							</TabsTrigger>
							<TabsTrigger value="ata">Ata e Documentos</TabsTrigger>
						</TabsList>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Link to="/meetings/$meetingId/council" params={{ meetingId }}>
							<Button variant="secondary" size="sm">
								Conselho
							</Button>
						</Link>
						<Link to="/meetings/$meetingId/participants" params={{ meetingId }}>
							<Button variant="secondary" size="sm">
								Participantes
							</Button>
						</Link>
						<Link to="/meetings/$meetingId/students" params={{ meetingId }}>
							<Button variant="secondary" size="sm">
								Acompanhamento
							</Button>
						</Link>
					</div>
				</div>

				<TabsContent value="visao-geral" className="space-y-6">
					<div className="grid gap-4 md:grid-cols-3">
						<Card className="flex flex-col justify-between border-primary/20 bg-card/60 transition-colors hover:border-primary/40">
							<CardHeader>
								<div className="flex items-center gap-2">
									<div className="rounded-lg bg-primary/10 p-2 text-primary">
										<UsersIcon className="size-5" />
									</div>
									<CardTitle className="text-lg">Sala do Conselho</CardTitle>
								</div>
								<CardDescription>
									Painel interativo para debater caso a caso os estudantes,
									lançar registros avaliativos e indicar apontamentos na ata.
								</CardDescription>
							</CardHeader>
							<CardFooter>
								<Link
									to="/meetings/$meetingId/council"
									params={{ meetingId }}
									className="w-full"
								>
									<Button className="w-full justify-between">
										Entrar no Conselho
										<ArrowRightIcon className="size-4" />
									</Button>
								</Link>
							</CardFooter>
						</Card>

						<Card className="flex flex-col justify-between border-primary/20 bg-card/60 transition-colors hover:border-primary/40">
							<CardHeader>
								<div className="flex items-center gap-2">
									<div className="rounded-lg bg-primary/10 p-2 text-primary">
										<CheckCircle2Icon className="size-5" />
									</div>
									<CardTitle className="text-lg">
										Acompanhamento de Turma
									</CardTitle>
								</div>
								<CardDescription>
									Verifique em lote o andamento dos estudantes (Pendente, Em
									discussão, Concluído) e acompanhe o progresso até 100%.
								</CardDescription>
							</CardHeader>
							<CardFooter>
								<Link
									to="/meetings/$meetingId/students"
									params={{ meetingId }}
									className="w-full"
								>
									<Button variant="outline" className="w-full justify-between">
										Ver Acompanhamento
										<ArrowRightIcon className="size-4" />
									</Button>
								</Link>
							</CardFooter>
						</Card>

						<Card className="flex flex-col justify-between border-primary/20 bg-card/60 transition-colors hover:border-primary/40">
							<CardHeader>
								<div className="flex items-center gap-2">
									<div className="rounded-lg bg-primary/10 p-2 text-primary">
										<FileTextIcon className="size-5" />
									</div>
									<CardTitle className="text-lg">Ata e Documentação</CardTitle>
								</div>
								<CardDescription>
									Gere versões consolidadas da ata, consulte o documento
									completo e baixe o arquivo em PDF para arquivamento.
								</CardDescription>
							</CardHeader>
							<CardFooter>
								<Link to="/minutes" className="w-full">
									<Button variant="outline" className="w-full justify-between">
										Abrir Módulo de Atas
										<ArrowRightIcon className="size-4" />
									</Button>
								</Link>
							</CardFooter>
						</Card>
					</div>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Turmas desta Reunião</CardTitle>
								<CardDescription>
									Turmas que fazem parte da pauta de deliberação.
								</CardDescription>
							</div>
							<Link to="/meetings/$meetingId/council" params={{ meetingId }}>
								<Button variant="outline" size="sm">
									Iniciar pelo Conselho
								</Button>
							</Link>
						</CardHeader>
						<CardContent>
							{isLoadingClasses && <Skeleton className="h-16 w-full" />}
							{!isLoadingClasses && meetingClasses.length === 0 && (
								<p className="text-sm text-muted-foreground">
									Nenhuma turma cadastrada para esta reunião.
								</p>
							)}
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{meetingClasses.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40"
									>
										<div className="min-w-0">
											<p className="truncate font-semibold text-foreground">
												{item.class?.name ?? item.classId}
											</p>
											<p className="text-xs text-muted-foreground">
												{item.class?.academicPeriod ?? "2026"}
												{item.class?.course ? ` · ${item.class.course}` : ""}
												{item.class?.shift ? ` · ${item.class.shift}` : ""}
											</p>
										</div>
										<Link
											to="/meetings/$meetingId/council"
											params={{ meetingId }}
										>
											<Button size="sm" variant="ghost">
												Ver
											</Button>
										</Link>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="turmas" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Turmas Participantes</CardTitle>
							<CardDescription>
								Todas as turmas vinculadas a este conselho de classe.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoadingClasses && <Skeleton className="h-24 w-full" />}
							{!isLoadingClasses && meetingClasses.length === 0 && (
								<Empty>
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<GraduationCapIcon />
										</EmptyMedia>
										<EmptyTitle>Nenhuma turma selecionada</EmptyTitle>
										<EmptyDescription>
											Edite a reunião para vincular as turmas participantes.
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							)}
							<div className="space-y-3">
								{meetingClasses.map((item) => (
									<div
										key={item.id}
										className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 shadow-2xs"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<h3 className="font-semibold text-base">
													{item.class?.name ?? item.classId}
												</h3>
												{item.class?.grade && (
													<Badge variant="outline">{item.class.grade}</Badge>
												)}
											</div>
											<p className="text-xs text-muted-foreground">
												Período: {item.class?.academicPeriod ?? "2026"}
												{item.class?.shift
													? ` · Turno ${item.class.shift}`
													: ""}
												{item.class?.course ? ` · ${item.class.course}` : ""}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Link
												to="/meetings/$meetingId/council"
												params={{ meetingId }}
											>
												<Button size="sm">Abrir no Conselho</Button>
											</Link>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="participantes" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<CardTitle>Equipe e Participantes</CardTitle>
									<CardDescription>
										Servidores designados e seus respectivos papéis na reunião.
									</CardDescription>
								</div>
								<Link
									to="/meetings/$meetingId/participants"
									params={{ meetingId }}
								>
									<Button variant="outline" size="sm">
										Página completa de participantes
									</Button>
								</Link>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{canEdit && (
								<div className="rounded-lg border bg-muted/30 p-4 space-y-3">
									<h4 className="text-sm font-semibold">
										Adicionar participante
									</h4>
									<div className="flex flex-wrap items-end gap-2">
										<EntitySelect
											label="Servidor"
											placeholder="Selecione o servidor"
											value={staffId}
											onChange={setStaffId}
											options={staff}
											isLoading={isLoadingStaff}
											total={staffResult?.total ?? 0}
											loadedAll={staffResult?.loadedAll ?? true}
											search={staffSearch}
											onSearchChange={setStaffSearch}
										/>
										<EntitySelect
											label="Papel"
											placeholder="Selecione o papel"
											value={roleId}
											onChange={setRoleId}
											options={roles}
											isLoading={isLoadingRoles}
											total={rolesResult?.total ?? 0}
											loadedAll={rolesResult?.loadedAll ?? true}
											search={roleSearch}
											onSearchChange={setRoleSearch}
										/>
										<Button
											type="button"
											onClick={() => void handleAddParticipant()}
											disabled={addParticipant.isPending}
										>
											<PlusIcon className="mr-1.5 size-4" />
											Adicionar
										</Button>
									</div>
									{participantError && (
										<p className="text-sm text-destructive">
											{participantError}
										</p>
									)}
								</div>
							)}

							{isLoadingParticipants && <Skeleton className="h-20 w-full" />}
							{!isLoadingParticipants && participants.length === 0 && (
								<Empty>
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<UsersIcon />
										</EmptyMedia>
										<EmptyTitle>Nenhum participante adicionado</EmptyTitle>
										<EmptyDescription>
											Adicione servidores para compor a equipe desta reunião.
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							)}

							<div className="grid gap-2 sm:grid-cols-2">
								{participants.map((p) => {
									const memberName = staffById.get(p.staffId) ?? p.staffId;
									const roleName = roleById.get(p.roleId) ?? p.roleId;
									return (
										<div
											key={p.id}
											className="flex items-center gap-3 rounded-lg border p-3 text-sm shadow-2xs"
										>
											<Avatar className="size-9 shrink-0">
												<AvatarFallback>{initials(memberName)}</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-foreground">
													{memberName}
												</p>
												<Badge variant="secondary" className="mt-0.5 text-xs">
													{roleName}
												</Badge>
											</div>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="ata" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<CardTitle>Ata da Reunião</CardTitle>
									<CardDescription>
										Status, prévia e versões emitidas da ata do conselho.
									</CardDescription>
								</div>
								<div className="flex items-center gap-2">
									<Button
										onClick={() => generate.mutate({})}
										disabled={generate.isPending || isDraft}
									>
										{generate.isPending ? "Gerando..." : "Gerar nova versão"}
									</Button>
									<Link to="/minutes">
										<Button variant="outline">Ir para Atas</Button>
									</Link>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{isDraft && (
								<p className="text-sm text-muted-foreground">
									Reunião em rascunho — inicie a reunião para gerar a versão
									oficial da ata.
								</p>
							)}
							{generate.error && (
								<p role="alert" className="text-sm text-destructive">
									{generate.error.message || "Falha ao gerar ata"}
								</p>
							)}
							{generate.data && (
								<p role="status" className="text-sm text-primary font-medium">
									Versão {generate.data.version} gerada com sucesso em{" "}
									{new Date(generate.data.createdAt).toLocaleString("pt-BR")}.
								</p>
							)}

							{preview.isLoading && <Skeleton className="h-32 w-full" />}
							{preview.data && (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											Prévia do conteúdo atual
										</span>
										<Badge
											variant={
												preview.data.approvalStatus === "aprovada"
													? "default"
													: "secondary"
											}
										>
											Status: {preview.data.approvalStatus}
										</Badge>
									</div>
									<pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground">
										{preview.data.content}
									</pre>
								</div>
							)}

							<div className="space-y-2 pt-2 border-t">
								<h4 className="text-sm font-semibold">Histórico de Versões</h4>
								{versions.isLoading && <Skeleton className="h-12 w-full" />}
								{versions.data && versions.data.length === 0 && (
									<p className="text-sm text-muted-foreground">
										Nenhuma versão gerada até o momento.
									</p>
								)}
								{versions.data && versions.data.length > 0 && (
									<ul className="divide-y rounded-lg border">
										{versions.data.map((version) => (
											<li
												key={version.id}
												className="flex items-center justify-between p-3 text-sm"
											>
												<div className="flex items-center gap-2">
													<span className="font-medium">
														Versão {version.version}
													</span>
													{version.isCurrent && (
														<Badge variant="default" className="text-xs">
															Atual
														</Badge>
													)}
													<span className="text-xs text-muted-foreground">
														{new Date(version.createdAt).toLocaleString(
															"pt-BR",
														)}
													</span>
												</div>
												{version.hasPdf && (
													<a
														className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
														href={`/api/meetings/${meetingId}/minutes/versions/${version.version}/pdf`}
														target="_blank"
														rel="noreferrer"
													>
														<DownloadIcon className="size-3.5" />
														Baixar PDF
													</a>
												)}
											</li>
										))}
									</ul>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</PageShell>
	);
}
