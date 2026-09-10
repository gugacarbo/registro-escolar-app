import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { EnrollmentFormValues } from "#/components/enrollments/enrollment-form";
import { EnrollmentForm } from "#/components/enrollments/enrollment-form";
import { useCreateEnrollment } from "#/hooks/enrollments/use-create-enrollment";

export const Route = createFileRoute("/_app/classes/enroll")({
	component: EnrollPage,
});

function EnrollPage() {
	const navigate = useNavigate();
	const createEnrollment = useCreateEnrollment();
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: EnrollmentFormValues) {
		setServerError(null);
		try {
			await createEnrollment.mutateAsync({
				estudanteId: values.estudanteId,
				turmaId: values.turmaId,
				dataInicio: values.dataInicio,
				...(values.dataTermino ? { dataTermino: values.dataTermino } : {}),
				status: values.status,
			});
			void navigate({
				to: "/classes/$id/students",
				params: { id: values.turmaId },
				search: { date: values.dataInicio },
			});
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<h1 className="text-2xl font-bold">Matricular estudante</h1>
			<EnrollmentForm onSubmit={handleSubmit} serverError={serverError} />
		</div>
	);
}
