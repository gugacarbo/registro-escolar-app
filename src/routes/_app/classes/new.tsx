import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ClassFormValues } from "#/components/classes/class-form";
import { ClassForm } from "#/components/classes/class-form";
import { useCreateClass } from "#/hooks/classes/use-create-class";

export const Route = createFileRoute("/_app/classes/new")({
	component: NewClassPage,
});

function NewClassPage() {
	const navigate = useNavigate();
	const createClass = useCreateClass();
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: ClassFormValues) {
		setServerError(null);
		try {
			await createClass.mutateAsync({
				nome: values.nome,
				periodoLetivo: values.periodoLetivo,
				...(values.curso ? { curso: values.curso } : {}),
				...(values.serie ? { serie: values.serie } : {}),
				...(values.turno ? { turno: values.turno } : {}),
			});
			void navigate({ to: "/classes" });
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<h1 className="text-2xl font-bold">Nova turma</h1>
			<ClassForm onSubmit={handleSubmit} serverError={serverError} />
		</div>
	);
}
