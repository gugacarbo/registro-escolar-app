import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
	ComponentForm,
	type ComponentFormValues,
} from "#/components/components/component-form";
import { useCreateComponent } from "#/hooks/components/use-create-component";

export const Route = createFileRoute("/_app/components/new")({
	component: NewComponentPage,
});

function NewComponentPage() {
	const navigate = useNavigate();
	const createComponent = useCreateComponent();
	const [serverError, setServerError] = useState<string | null>(null);

	async function handleSubmit(values: ComponentFormValues) {
		setServerError(null);
		try {
			await createComponent.mutateAsync({ name: values.nome });
			void navigate({ to: "/components" });
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<h1 className="text-2xl font-bold">Novo componente</h1>
			<ComponentForm onSubmit={handleSubmit} serverError={serverError} />
		</div>
	);
}
