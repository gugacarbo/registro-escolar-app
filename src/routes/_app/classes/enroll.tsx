import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import type { EnrollmentFormValues } from "#/components/enrollments/enrollment-form";
import { EnrollmentForm } from "#/components/enrollments/enrollment-form";
import { FormPage } from "#/components/ui/page-recipes";
import { useCreateEnrollment } from "#/hooks/enrollments/use-create-enrollment";

export const Route = createFileRoute("/_app/classes/enroll")({
	component: EnrollPage,
});

export function EnrollPage() {
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
			toast.success("Estudante matriculado");
			void navigate({
				to: "/classes/$id/students",
				params: { id: values.turmaId },
			});
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<FormPage
			title="Matricular estudante"
			backTo={{ to: "/classes", label: "Voltar" }}
		>
			<EnrollmentForm onSubmit={handleSubmit} serverError={serverError} />
		</FormPage>
	);
}

export default EnrollPage;
