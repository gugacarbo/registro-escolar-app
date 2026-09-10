import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { EntitySelect } from "#/components/ui/entity-select";
import { PageShell } from "#/components/ui/page";
import { Skeleton } from "#/components/ui/skeleton";
import { fetchClassesPage } from "#/hooks/entity-fetchers";
import { useMeetingClassStudents } from "#/hooks/meetings/use-meeting-class-students";
import { useUpdateStudentStatus } from "#/hooks/meetings/use-update-student-status";
import { useAsyncOptions } from "#/hooks/use-async-options";
import type { TrackingStatus } from "#/lib/meeting-student-status/schema";

export const Route = createFileRoute("/_app/meetings/$meetingId/students")({
	component: MeetingStudentsPage,
});

const STATUS_LABELS: Record<TrackingStatus, string> = {
	pendente: "Pendente",
	em_discussao: "Em discussão",
	concluido: "Concluído",
	nao_discutido: "Não discutido",
};

const STATUS_ACTIONS: TrackingStatus[] = [
	"em_discussao",
	"concluido",
	"nao_discutido",
	"pendente",
];

function MeetingStudentsPage() {
	const { meetingId } = Route.useParams();
	const [classSearch, setClassSearch] = useState("");
	const { data: classesResult, isLoading: isLoadingClasses } = useAsyncOptions({
		queryKey: ["meeting-students", "classes"],
		search: classSearch,
		fetchPage: fetchClassesPage,
		select: (turma) => ({ id: turma.id, name: turma.name }),
	});
	const classes = classesResult?.options ?? [];
	const [classId, setClassId] = useState("");
	const {
		data: result,
		isLoading: isLoadingStudents,
		isError,
	} = useMeetingClassStudents(meetingId, classId);
	const updateStatus = useUpdateStudentStatus(meetingId);
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleStatusChange(studentId: string, status: TrackingStatus) {
		setServerError(null);
		try {
			await updateStatus.mutateAsync({ studentId, status, classId });
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	const counters = result?.counters;
	const percentage =
		counters && counters.total > 0
			? Math.round((counters.concluido / counters.total) * 100)
			: 0;
	const isComplete =
		!!counters && counters.total > 0 && counters.concluido === counters.total;

	return (
		<PageShell>
			<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
				Acompanhamento de estudantes
			</h1>

			<EntitySelect
				label="Turma"
				placeholder="Selecione a turma"
				value={classId}
				onChange={setClassId}
				options={classes}
				isLoading={isLoadingClasses}
				total={classesResult?.total ?? 0}
				loadedAll={classesResult?.loadedAll ?? true}
				search={classSearch}
				onSearchChange={setClassSearch}
			/>

			{serverError && <p className="text-sm text-destructive">{serverError}</p>}

			{(isLoadingClasses || isLoadingStudents) && classId && (
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			)}

			{!classId && !isLoadingClasses && (
				<p className="text-sm text-muted-foreground">
					Selecione uma turma para acompanhar os estudantes.
				</p>
			)}

			{isError && classId && (
				<p className="text-sm text-muted-foreground">
					Esta turma não participa desta reunião ou não pôde ser carregada.
				</p>
			)}

			{result && (
				<>
					<div
						role="progressbar"
						aria-valuenow={percentage}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Progresso da turma"
						className="space-y-1"
					>
						<p className="text-sm">
							{counters?.concluido} de {counters?.total} concluídos (
							{percentage}%)
						</p>
						<div className="h-2 w-full rounded bg-muted">
							<div
								className="h-2 rounded bg-primary transition-all"
								style={{ width: `${percentage}%` }}
							/>
						</div>
					</div>

					{isComplete && (
						<p className="text-sm font-medium">
							Todas as turmas foram concluídas: progresso de 100%. Revise os
							registros e encerre a reunião.
						</p>
					)}

					<ul className="space-y-2">
						{result.students.map((student) => (
							<li
								key={student.studentId}
								className={
									result.nextPendingStudentId === student.studentId
										? "rounded border-2 border-primary p-2"
										: "rounded border p-2"
								}
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="font-medium">{student.name}</p>
										{student.registrationNumber && (
											<p className="text-xs text-muted-foreground">
												Matrícula {student.registrationNumber}
											</p>
										)}
									</div>
									<Badge
										variant={
											student.status === "concluido"
												? "default"
												: student.status === "em_discussao"
													? "secondary"
													: "outline"
										}
									>
										{STATUS_LABELS[student.status]}
									</Badge>
								</div>
								{result.nextPendingStudentId === student.studentId && (
									<p className="mt-1 text-xs font-medium text-primary">
										Próximo pendente
									</p>
								)}
								<div className="mt-2 flex flex-wrap gap-1">
									{STATUS_ACTIONS.filter((s) => s !== student.status).map(
										(next) => (
											<Button
												key={next}
												size="sm"
												variant={next === "concluido" ? "default" : "outline"}
												aria-label={`Marcar ${student.name} como ${STATUS_LABELS[next]}`}
												disabled={updateStatus.isPending}
												onClick={() =>
													void handleStatusChange(student.studentId, next)
												}
											>
												{STATUS_LABELS[next]}
											</Button>
										),
									)}
								</div>
							</li>
						))}
					</ul>
				</>
			)}
		</PageShell>
	);
}
