import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CakeIcon,
	HashIcon,
	IdCardIcon,
	PencilIcon,
	Users2Icon,
} from "lucide-react";
import { useState } from "react";
import { EnrollmentStatusBadge } from "#/components/enrollments/enrollment-status-badge";
import { StudentHistoryPanel } from "#/components/history/student-history-panel";
import {
	StudentForm,
	type StudentFormValues,
} from "#/components/students/student-form";
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
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { PageHeader, PageSection, PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { useStudent } from "#/hooks/students/use-student";
import { useUpdateStudent } from "#/hooks/students/use-update-student";
import type { StudentDetail } from "#/lib/students/types";

export const Route = createFileRoute("/_app/students/$id")({
	component: StudentDetailPage,
});

/** Data (sem hora) em pt-BR a partir de ISO/Date, sem desvio de fuso. */
function formatDate(value: Date | string | null | undefined): string {
	if (!value) {
		return "";
	}
	const iso = value instanceof Date ? value.toISOString() : value;
	const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
	return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
		dateStyle: "short",
	});
}

function formatDateTime(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	return date.toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function formatBirthDate(value: Date | string | null | undefined): string {
	if (!value) {
		return "";
	}
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function toStudentFormValues(student: StudentDetail): StudentFormValues {
	return {
		name: student.name,
		document: student.document ?? "",
		registrationNumber: student.registrationNumber ?? "",
		email: student.email ?? "",
		phone: student.phone ?? "",
		birthDate: formatBirthDate(student.birthDate),
		notes: student.notes ?? "",
	};
}

function InfoField({
	label,
	value,
	className,
}: {
	label: string;
	value?: string | null;
	className?: string;
}) {
	return (
		<div className={className}>
			<dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				{label}
			</dt>
			<dd className="mt-0.5 text-sm break-words">{value || "—"}</dd>
		</div>
	);
}

export default function StudentDetailPage() {
	const { id } = Route.useParams();
	const { data: student, isLoading, isError, error } = useStudent(id);
	const updateStudent = useUpdateStudent(id);
	const [editing, setEditing] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function handleSubmit(values: StudentFormValues) {
		setServerError(null);
		setSaved(false);
		try {
			await updateStudent.mutateAsync({
				name: values.name,
				document: values.document || null,
				registrationNumber: values.registrationNumber || null,
				email: values.email || null,
				phone: values.phone || null,
				birthDate: values.birthDate || null,
				notes: values.notes || null,
			});
			setSaved(true);
			setEditing(false);
		} catch (submitError) {
			if (submitError instanceof Error) {
				setServerError(submitError.message);
			}
		}
	}

	function startEdit() {
		setServerError(null);
		setSaved(false);
		setEditing(true);
	}

	return (
		<PageShell>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/students">Estudantes</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{student?.name ?? "Detalhe"}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				eyebrow="Estudantes"
				title={student?.name ?? "Estudante"}
				description={
					student ? (
						<div className="flex flex-wrap items-center gap-x-5 gap-y-1">
							{student.document && (
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<IdCardIcon className="size-4 shrink-0 text-primary/70" />
									Documento{" "}
									<strong className="font-medium text-foreground">
										{student.document}
									</strong>
								</span>
							)}
							{student.registrationNumber && (
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<HashIcon className="size-4 shrink-0 text-primary/70" />
									Matrícula{" "}
									<strong className="font-medium text-foreground">
										{student.registrationNumber}
									</strong>
								</span>
							)}
							{student.birthDate && (
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<CakeIcon className="size-4 shrink-0 text-primary/70" />
									Nascimento{" "}
									<strong className="font-medium text-foreground">
										{formatDate(student.birthDate)}
									</strong>
								</span>
							)}
						</div>
					) : isLoading ? (
						<Skeleton className="h-4 w-64" />
					) : undefined
				}
			/>

			{isError && (
				<div
					role="alert"
					className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive shadow-xs"
				>
					{error instanceof Error
						? error.message
						: "Falha ao carregar o estudante"}
				</div>
			)}

			{!student && isLoading && (
				<div className="space-y-2" aria-busy="true">
					<Skeleton className="h-44 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			)}

			{student && (
				<div className="grid items-start gap-4 lg:grid-cols-5">
					<PageSection
						className="lg:col-span-3"
						title="Dados do estudante"
						description="Informações cadastrais do estudante."
						actions={
							editing ? (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setEditing(false)}
								>
									Cancelar
								</Button>
							) : (
								<Button variant="outline" size="sm" onClick={startEdit}>
									<PencilIcon className="mr-1.5 size-3.5" />
									Editar
								</Button>
							)
						}
					>
						{saved && !editing && (
							<p
								role="status"
								className="rounded-lg border border-primary/20 bg-secondary/80 p-3 text-sm text-foreground shadow-xs"
							>
								Estudante atualizado
							</p>
						)}
						{editing ? (
							<StudentForm
								key={student.id + String(student.updatedAt)}
								defaultValues={toStudentFormValues(student)}
								onSubmit={handleSubmit}
								submitLabel="Salvar alterações"
								serverError={serverError}
							/>
						) : (
							<dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
								<InfoField label="Documento" value={student.document} />
								<InfoField
									label="Matrícula"
									value={student.registrationNumber}
								/>
								<InfoField label="Email" value={student.email} />
								<InfoField label="Telefone" value={student.phone} />
								<InfoField
									label="Nascimento"
									value={formatDate(student.birthDate)}
								/>
								{student.notes ? (
									<InfoField
										label="Observações"
										value={student.notes}
										className="sm:col-span-2"
									/>
								) : null}
							</dl>
						)}
						<p className="border-t pt-3 text-xs text-muted-foreground">
							Registro em {formatDate(student.createdAt)} · Atualizado em{" "}
							{formatDateTime(student.updatedAt)}
						</p>
					</PageSection>

					<PageSection
						className="lg:col-span-2"
						title="Turmas"
						description="Vínculos do estudante, ativos e encerrados."
					>
						{student.matriculas.length === 0 ? (
							<Empty className="border-0">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Users2Icon />
									</EmptyMedia>
									<EmptyTitle>Nenhuma turma vinculada</EmptyTitle>
									<EmptyDescription>
										Matricule o estudante para acompanhar vínculos e histórico.
									</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<Button asChild variant="outline" size="sm">
										<Link to="/classes/enroll">Matricular na turma</Link>
									</Button>
								</EmptyContent>
							</Empty>
						) : (
							<ul aria-label="Turmas do estudante" className="grid gap-2">
								{student.matriculas.map((matricula) => (
									<li
										key={matricula.id}
										className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/40 p-3"
									>
										<div className="min-w-0">
											<Link
												to="/classes/$id/students"
												params={{ id: matricula.id }}
												className="font-medium hover:underline"
											>
												{matricula.name}
											</Link>
											<p className="text-sm text-muted-foreground">
												Início {formatDate(matricula.startDate)}
												{matricula.endDate
													? ` · Fim ${formatDate(matricula.endDate)}`
													: " · Em andamento"}
											</p>
										</div>
										<EnrollmentStatusBadge status={matricula.status} />
									</li>
								))}
							</ul>
						)}
					</PageSection>
				</div>
			)}

			{student && <StudentHistoryPanel studentId={student.id} />}
		</PageShell>
	);
}
