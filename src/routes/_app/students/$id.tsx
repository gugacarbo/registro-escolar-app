import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
	StudentForm,
	type StudentFormValues,
} from "#/components/students/student-form";
import { Button } from "#/components/ui/button";
import { useStudent } from "#/hooks/students/use-student";
import { useUpdateStudent } from "#/hooks/students/use-update-student";
import type { Student } from "#/lib/students/schema";

export const Route = createFileRoute("/_app/students/$id")({
	component: StudentDetailPage,
});

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

export function toStudentFormValues(student: Student): StudentFormValues {
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

export function StudentDetailPage() {
	const { id } = Route.useParams();
	const { data: student, isLoading, isError, error } = useStudent(id);
	const updateStudent = useUpdateStudent(id);
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
		} catch (submitError) {
			if (submitError instanceof Error) {
				setServerError(submitError.message);
			}
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h1 className="text-2xl font-bold">
					{student?.name ?? "Dados do estudante"}
				</h1>
				<Link to="/students">
					<Button variant="secondary">Voltar para a lista</Button>
				</Link>
			</div>
			{isLoading && <p>Carregando...</p>}
			{isError && (
				<p className="text-sm text-destructive">
					{error instanceof Error ? error.message : "Falha ao carregar estudante"}
				</p>
			)}
			{student && (
				<>
					{saved && (
						<p className="text-sm text-muted-foreground" role="status">
							Estudante atualizado
						</p>
					)}
					<StudentForm
						key={student.id + String(student.updatedAt)}
						defaultValues={toStudentFormValues(student)}
						onSubmit={handleSubmit}
						submitLabel="Salvar alterações"
						serverError={serverError}
					/>
				</>
			)}
		</div>
	);
}
