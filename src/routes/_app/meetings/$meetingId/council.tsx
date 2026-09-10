import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	RecordForm,
	type RecordFormSubmitValues,
} from "#/components/meetings/record-form";
import { TransitionButtons } from "#/components/meetings/transition-buttons";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
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

export function CouncilPage() {
	const { meetingId } = Route.useParams();
	const { data: meeting, isLoading: isLoadingMeeting } = useMeeting(meetingId);
	const { data: meetingClasses = [], isLoading: isLoadingClasses } =
		useMeetingClasses(meetingId);
	const [selectedClassId, setSelectedClassId] = useState("");
	const activeClassId = selectedClassId || meetingClasses[0]?.classId || "";
	const {
		data: classStudents,
		isLoading: isLoadingStudents,
		isError: isErrorStudents,
	} = useMeetingClassStudents(meetingId, activeClassId);
	const [selectedStudentId, setSelectedStudentId] = useState("");
	const students = classStudents?.students ?? [];
	const selectedStudent =
		students.find((student) => student.studentId === selectedStudentId) ??
		students[0];
	const {
		data: recordsResult,
		isLoading: isLoadingRecords,
		isError: isErrorRecords,
	} = useMeetingStudentRecords(meetingId, selectedStudent?.studentId ?? "");
	const createRecord = useCreateLinkedRecord(meetingId);
	const updateRecord = useUpdateLinkedRecord(meetingId);
	const setInclusion = useSetRecordInclusion(meetingId);
	const [serverError, setServerError] = useState<string | null>(null);
	const [editingRecord, setEditingRecord] = useState<string | null>(null);
	const canEdit =
		!!meeting && canEditLinkedRecord(meeting.status as MeetingStatus);

	async function handleCreate(values: RecordFormSubmitValues) {
		if (!selectedStudent) return;
		setServerError(null);
		try {
			await createRecord.mutateAsync({
				studentId: selectedStudent.studentId,
				texto: values.texto,
				componenteId: values.componenteId,
				origemId: values.origemId,
				incluirNaAta: values.incluirNaAta,
			});
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	async function handleUpdate(values: RecordFormSubmitValues) {
		if (!selectedStudent || !editingRecord) return;
		setServerError(null);
		try {
			await updateRecord.mutateAsync({
				studentId: selectedStudent.studentId,
				recordId: editingRecord,
				texto: values.texto,
				componenteId: values.componenteId,
				origemId: values.origemId,
				incluirNaAta: values.incluirNaAta,
			});
			setEditingRecord(null);
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	async function handleInclusion(
		record: MeetingStudentRecord,
		include: boolean,
	) {
		if (!selectedStudent) return;
		setServerError(null);
		try {
			await setInclusion.mutateAsync({
				studentId: selectedStudent.studentId,
				record,
				incluir: include,
			});
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Conselho de classe</h1>
			{isLoadingMeeting && <p>Carregando...</p>}
			{meeting && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="font-medium">{meeting.title}</span>
					<TransitionButtons meetingId={meeting.id} status={meeting.status} />
				</div>
			)}
			<section className="space-y-3">
				<h2 className="text-lg font-semibold">Turmas</h2>
				{isLoadingClasses && <Skeleton className="h-10 w-full" />}
				{!isLoadingClasses && meetingClasses.length === 0 && (
					<p className="text-sm text-muted-foreground">
						Nenhuma turma vinculada a esta reunião.
					</p>
				)}
				{meetingClasses.length > 0 && (
					<div
						className="flex flex-wrap gap-2"
						role="group"
						aria-label="Turmas da reunião"
					>
						{meetingClasses.map((link) => (
							<Button
								key={link.id}
								type="button"
								variant={activeClassId === link.classId ? "default" : "outline"}
								onClick={() => {
									setSelectedClassId(link.classId);
									setSelectedStudentId("");
								}}
							>
								{link.class?.name ?? link.classId}
							</Button>
						))}
					</div>
				)}
				{activeClassId && isLoadingStudents && <p>Carregando estudantes...</p>}
				{activeClassId && isErrorStudents && (
					<p className="text-sm text-muted-foreground">
						Não foi possível carregar os estudantes desta turma.
					</p>
				)}
				{students.length > 0 && (
					<div
						className="flex flex-wrap gap-2"
						role="group"
						aria-label="Estudantes da turma"
					>
						{students.map((student: StudentOption) => (
							<Button
								key={student.studentId}
								type="button"
								size="sm"
								variant={
									selectedStudent?.studentId === student.studentId
										? "default"
										: "outline"
								}
								onClick={() => {
									setSelectedStudentId(student.studentId);
									setEditingRecord(null);
								}}
							>
								{student.name}
							</Button>
						))}
					</div>
				)}
				{activeClassId && !isLoadingStudents && students.length === 0 && (
					<p className="text-sm text-muted-foreground">
						Nenhum estudante vinculado a esta turma na data da reunião.
					</p>
				)}
			</section>
			{selectedStudent && (
				<section className="space-y-3" aria-labelledby="records-title">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<h2 id="records-title" className="text-lg font-semibold">
								Registros de {selectedStudent.name}
							</h2>
							{selectedStudent.registrationNumber && (
								<p className="text-xs text-muted-foreground">
									Matrícula {selectedStudent.registrationNumber}
								</p>
							)}
						</div>
						{!canEdit && (
							<p className="text-sm text-muted-foreground" role="status">
								Reunião finalizada — reabra para editar registros vinculados.
							</p>
						)}
					</div>
					{isLoadingRecords && <Skeleton className="h-20 w-full" />}
					{isErrorRecords && (
						<p className="text-sm text-muted-foreground">
							Não foi possível carregar os registros.
						</p>
					)}
					{recordsResult && recordsResult.records.length === 0 && (
						<p className="text-sm text-muted-foreground">
							Nenhum registro para este estudante.
						</p>
					)}
					<ul className="space-y-2">
						{(recordsResult?.records ?? []).map((record) => (
							<li key={record.id} className="rounded border p-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<Badge
												variant={
													record.scope === "vinculado" ? "default" : "secondary"
												}
											>
												{record.scope === "vinculado"
													? "Vinculado"
													: "Contexto"}
											</Badge>
											<Badge
												variant={
													record.includeInMinutes ? "outline" : "destructive"
												}
											>
												{record.includeInMinutes
													? "Incluído na ata"
													: "Interno"}
											</Badge>
										</div>
										<p>{record.texto}</p>
										<p className="text-xs text-muted-foreground">
											{formatDate(record.createdAt)}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										{record.scope === "contexto" && (
											<Button
												type="button"
												size="sm"
												variant={
													record.includeInMinutes ? "outline" : "default"
												}
												disabled={!canEdit || setInclusion.isPending}
												onClick={() =>
													void handleInclusion(record, !record.includeInMinutes)
												}
											>
												{record.includeInMinutes
													? "Remover da ata"
													: "Incluir na ata"}
											</Button>
										)}
										{record.scope === "vinculado" && (
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={!canEdit || updateRecord.isPending}
												onClick={() => setEditingRecord(record.id)}
											>
												{editingRecord === record.id ? "Editando" : "Editar"}
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
					<section className="space-y-2">
						<h3 className="text-base font-semibold">Novo registro vinculado</h3>
						<RecordForm
							meetingId={meetingId}
							onSubmit={handleCreate}
							submitLabel="Adicionar registro"
							disabled={!canEdit || createRecord.isPending}
						/>
					</section>
					{serverError && (
						<p className="text-sm text-destructive">{serverError}</p>
					)}
				</section>
			)}
		</div>
	);
}
