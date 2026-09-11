import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { EnrollmentFormValues } from "#/components/enrollments/enrollment-form";
import { EnrollmentForm } from "#/components/enrollments/enrollment-form";
import { Button } from "#/components/ui/button";
import { PageShell } from "#/components/ui/page";
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
		<PageShell className="mx-auto max-w-2xl">
			<Link to="/classes">
				<Button variant="ghost" size="sm">
					<ArrowLeft className="size-4" aria-hidden />
					Voltar
				</Button>
			</Link>
			<h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem]">
				Matricular estudante
			</h1>
			<EnrollmentForm onSubmit={handleSubmit} serverError={serverError} />
		</PageShell>
	);
}
