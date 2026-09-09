import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { StudentForm } from "#/components/students/student-form";
import { useCreateStudent } from "#/hooks/students/use-create-student";

export const Route = createFileRoute("/app/students/new")({
	component: NewStudentPage,
});

function NewStudentPage() {
	const navigate = useNavigate();
	const createStudent = useCreateStudent();
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: { name: string; document?: string }) {
		setServerError(null);
		try {
			await createStudent.mutateAsync(values);
			void navigate({ to: "/app/students" });
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<h1 className="text-2xl font-bold">Novo aluno</h1>
			<StudentForm onSubmit={handleSubmit} serverError={serverError} />
		</div>
	);
}
