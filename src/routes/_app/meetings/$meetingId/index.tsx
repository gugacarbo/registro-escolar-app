import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircleIcon,
	ArrowRightIcon,
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
import { Checkbox } from "#/components/ui/checkbox";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { EntitySelect } from "#/components/ui/entity-select";
import { Input } from "#/components/ui/input";
import { PageHeader, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	fetchClassesPage,
	fetchRolesPage,
	fetchStaffPage,
} from "#/hooks/entity-fetchers";
import { useAddMeetingClass } from "#/hooks/meetings/use-add-meeting-class";
import { useAddParticipant } from "#/hooks/meetings/use-add-participant";
import { useMeeting } from "#/hooks/meetings/use-meeting";
import { useMeetingClasses } from "#/hooks/meetings/use-meeting-classes";
import { useParticipants } from "#/hooks/meetings/use-participants";
import { useRemoveMeetingClass } from "#/hooks/meetings/use-remove-meeting-class";
import { useGenerateMinute } from "#/hooks/minutes/use-generate-minute";
import { useMinutePreview } from "#/hooks/minutes/use-minute-preview";
import { useMinuteTemplates } from "#/hooks/minutes/use-minute-templates";
import { useMinuteVersions } from "#/hooks/minutes/use-minute-versions";
import { useAsyncOptions } from "#/hooks/use-async-options";
import type { MeetingStatus } from "#/lib/meetings/schema";
import {
	canEditLinkedRecord,
	canEditMeetingData,
} from "#/lib/meetings/transitions";

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
	const { data: templates = [] } = useMinuteTemplates();

	const addMeetingClass = useAddMeetingClass(meetingId);
	const removeMeetingClass = useRemoveMeetingClass(meetingId);
	const [classSearch, setClassSearch] = useState("");
	const [classToAdd, setClassToAdd] = useState("");
	const [classError, setClassError] = useState<string | null>(null);
	const { data: classesResult, isLoading: isLoadingClassOptions } =
		useAsyncOptions({
			queryKey: ["meeting-detail-classes", "classes"],
			search: classSearch,
			fetchPage: fetchClassesPage,
			select: (classRow) => ({
				id: classRow.id,
				name: `${classRow.name} — ${classRow.academicPeriod}`,
			}),
		});
	const linkedClassIds = useMemo(
		() => new Set(meetingClasses.map((item) => item.classId)),
		[meetingClasses],
	);
	const classOptions = (classesResult?.options ?? []).filter(
		(option) => !linkedClassIds.has(option.id),
	);

	const preview = useMinutePreview(meetingId);
	const versions = useMinuteVersions(meetingId);
	const generate = useGenerateMinute(meetingId);
	const addParticipant = useAddParticipant(meetingId);

	const [activeTab, setActiveTab] = useState("turmas");

	// Participantes Selects
	const [staffSearch, setStaffSearch] = useState("");
	const [roleSearch, setRoleSearch] = useState("");
	const { data: staffResult, isLoading: isLoadingStaff } = useAsyncOptions({
		queryKey: ["meeting-detail-participants", "staff"],
		search: staffSearch,
		fetchPage: fetchStaffPage,
		select: (member) => ({
			id: member.id,
			name: member.name,
			defaultRoleId: member.defaultRoleId,
		}),
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
	const [roleIds, setRoleIds] = useState<string[]>([]);
	const [participantError, setParticipantError] = useState<string | null>(null);

	const canEdit =
		!!meeting && canEditLinkedRecord(meeting.status as MeetingStatus);
	const canEditData = !!meeting && canEditMeetingData(meeting.status);
	const isDraft = meeting?.status === "draft";
	const isApproved = preview.data?.approvalStatus === "aprovada";
	const activeTemplate = templates.find((t) => t.id === meeting?.templateId);

	async function handleAddClass() {
		setClassError(null);
		if (!classToAdd) {
			setClassError("Selecione uma turma");
			return;
		}
		try {
			await addMeetingClass.mutateAsync(classToAdd);
			setClassToAdd("");
		} catch (error) {
			if (error instanceof Error) setClassError(error.message);
		}
	}

	async function handleRemoveClass(classId: string) {
		setClassError(null);
		try {
			await removeMeetingClass.mutateAsync(classId);
		} catch (error) {
			if (error instanceof Error) setClassError(error.message);
		}
	}

	async function handleAddParticipant() {
		setParticipantError(null);
		if (!staffId || roleIds.length === 0) {
			setParticipantError("Selecione o servidor e o cargo");
			return;
		}
		try {
			await addParticipant.mutateAsync({ staffId, roleIds });
			setStaffId("");
			setRoleIds([]);
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
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
				eyebrow="Reunião"
				title={meeting.title}
				description={
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						<MeetingStatusBadge status={meeting.status} />
						<span className="flex items-center gap-1.5 text-muted-foreground">
							<CalendarIcon className="size-4 shrink-0 text-primary/70" />
							{formatDate(meeting.heldAt)}
						</span>
						{activeTemplate && (
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<FileTextIcon className="size-4 shrink-0 text-primary/70" />
								Modelo de ata: {activeTemplate.name}
							</span>
						)}
					</div>
				}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						{canEditData && (
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
								Participar da reunião
								<ArrowRightIcon className="size-4" />
							</Button>
						</Link>
					</div>
				}
			/>

			{(meeting.status === "finished" ||
				meeting.status === "draft" ||
				meeting.status === "in_progress" ||
				meeting.status === "reopened") && (
				<div
					role="status"
					className="flex items-center gap-2 rounded-lg border border-primary/20 bg-secondary/80 px-3 py-2 text-sm text-foreground shadow-xs"
				>
					{meeting.status === "finished" ? (
						<>
							<CheckCircle2Icon className="size-4 shrink-0 text-primary" />
							<span>
								Reunião finalizada — reabra para editar dados, turmas e
								registros
							</span>
						</>
					) : meeting.status === "draft" ? (
						<>
							<ClockIcon className="size-4 shrink-0 text-primary" />
							<span>
								Rascunho — revise turmas e participantes antes de iniciar
							</span>
						</>
					) : meeting.status === "reopened" ? (
						<>
							<AlertCircleIcon className="size-4 shrink-0 text-primary" />
							<span>Reaberta para ajustes — atualize a ata ao concluir</span>
						</>
					) : (
						<>
							<AlertCircleIcon className="size-4 shrink-0 text-primary" />
							<span>
								Em andamento — você pode ajustar dados e turmas desta reunião
							</span>
						</>
					)}
				</div>
			)}

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-4"
			>
				<div className="border-b pb-2">
					<div className="min-w-0 max-w-full overflow-x-auto">
						<TabsList>
							<TabsTrigger value="turmas">
								Turmas ({meetingClasses.length})
							</TabsTrigger>
							<TabsTrigger value="participantes">
								Participantes ({participants.length})
							</TabsTrigger>
							<TabsTrigger value="ata">
								Ata
								{versions.data?.length ? ` (${versions.data.length})` : ""}
							</TabsTrigger>
						</TabsList>
					</div>
				</div>

				<TabsContent value="turmas" className="space-y-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Turmas Participantes</CardTitle>
								<CardDescription>
									Todas as turmas vinculadas a esta reunião.
								</CardDescription>
							</div>
							<Link to="/meetings/$meetingId/students" params={{ meetingId }}>
								<Button variant="outline" size="sm">
									Acompanhamento
								</Button>
							</Link>
						</CardHeader>
						<CardContent className="space-y-4">
							{canEditData && (
								<div className="space-y-3 rounded-lg border bg-muted/30 p-4">
									<h4 className="text-sm font-semibold">Vincular turma</h4>
									<div className="flex flex-wrap items-end gap-2">
										<EntitySelect
											label="Turma"
											placeholder="Selecione a turma"
											value={classToAdd}
											onChange={setClassToAdd}
											options={classOptions}
											isLoading={isLoadingClassOptions}
											total={classesResult?.total ?? 0}
											loadedAll={classesResult?.loadedAll ?? true}
											search={classSearch}
											onSearchChange={setClassSearch}
										/>
										<Button
											type="button"
											onClick={() => void handleAddClass()}
											disabled={addMeetingClass.isPending}
										>
											<PlusIcon className="mr-1.5 size-4" />
											Vincular
										</Button>
									</div>
									{classError && (
										<p role="alert" className="text-sm text-destructive">
											{classError}
										</p>
									)}
								</div>
							)}
							{isLoadingClasses && <Skeleton className="h-24 w-full" />}
							{!isLoadingClasses && meetingClasses.length === 0 && (
								<Empty>
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<GraduationCapIcon />
										</EmptyMedia>
										<EmptyTitle>Nenhuma turma selecionada</EmptyTitle>
										<EmptyDescription>
											{canEditData
												? "Vincule as turmas participantes desta reunião."
												: "A reunião finalizada mantém as turmas vinculadas; reabra para alterar."}
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
												Período: {item.class?.academicPeriod ?? "—"}
												{item.class?.shift
													? ` · Turno ${item.class.shift}`
													: ""}
												{item.class?.course ? ` · ${item.class.course}` : ""}
											</p>
										</div>
										<div className="flex items-center gap-1">
											<Link
												to="/meetings/$meetingId/council"
												params={{ meetingId }}
											>
												<Button size="sm" variant="ghost">
													Ver
												</Button>
											</Link>
											{canEditData && (
												<Button
													size="sm"
													variant="ghost"
													onClick={() => void handleRemoveClass(item.classId)}
													disabled={removeMeetingClass.isPending}
												>
													Desvincular
												</Button>
											)}
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
										Servidores designados e seus respectivos cargos na reunião.
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
											onChange={(value) => {
												setStaffId(value);
												const selectedStaff = staff.find(
													(member) => member.id === value,
												);
												setRoleIds(
													selectedStaff?.defaultRoleId
														? [selectedStaff.defaultRoleId]
														: [],
												);
											}}
											options={staff}
											isLoading={isLoadingStaff}
											total={staffResult?.total ?? 0}
											loadedAll={staffResult?.loadedAll ?? true}
											search={staffSearch}
											onSearchChange={setStaffSearch}
										/>
										<fieldset className="grid min-w-48 gap-2">
											<legend className="text-sm font-medium">Cargos</legend>
											<Input
												value={roleSearch}
												onChange={(event) => setRoleSearch(event.target.value)}
												placeholder="Buscar cargo"
												aria-label="Buscar cargo"
											/>
											<div className="grid gap-2 rounded-md border p-2">
												{roles.map((role) => (
													<label
														key={role.id}
														className="flex items-center gap-2 text-sm"
													>
														<Checkbox
															checked={roleIds.includes(role.id)}
															onCheckedChange={(checked) =>
																setRoleIds((current) =>
																	checked
																		? [...current, role.id]
																		: current.filter((id) => id !== role.id),
																)
															}
														/>
														{role.name}
													</label>
												))}
												{isLoadingRoles && (
													<p className="text-xs text-muted-foreground">
														Carregando cargos...
													</p>
												)}
											</div>
											<p className="text-xs text-muted-foreground">
												{roleIds.length === 0
													? "Selecione um ou mais cargos."
													: `${roleIds.length} cargo(s) selecionado(s)`}
											</p>
										</fieldset>
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
										Status, prévia e versões emitidas da ata da reunião.
									</CardDescription>
								</div>
								<div className="flex items-center gap-2">
									{isApproved ? (
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button disabled={generate.isPending || isDraft}>
													{generate.isPending
														? "Gerando..."
														: "Gerar nova versão"}
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Gerar nova versão?
													</AlertDialogTitle>
													<AlertDialogDescription>
														Gerar nova versão vai reabrir a aprovação da ata.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancelar</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => generate.mutate({})}
													>
														Gerar nova versão
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									) : (
										<Button
											onClick={() => generate.mutate({})}
											disabled={generate.isPending || isDraft}
										>
											{generate.isPending ? "Gerando..." : "Gerar nova versão"}
										</Button>
									)}
									<Link to="/minutes/$meetingId" params={{ meetingId }}>
										<Button variant="secondary">Editar conteúdo da ata</Button>
									</Link>
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
											Status:{" "}
											{preview.data.approvalStatus === "aprovada"
												? "Aprovada"
												: "Pendente de aprovação"}
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
