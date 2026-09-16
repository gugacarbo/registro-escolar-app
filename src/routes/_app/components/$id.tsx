import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
	ComponentForm,
	type ComponentFormValues,
} from "#/components/components/component-form";
import { DetailPage } from "#/components/ui/page-recipes";
import { useComponent } from "#/hooks/components/use-component";
import { useUpdateComponent } from "#/hooks/components/use-update-component";

export const Route = createFileRoute("/_app/components/$id")({
	component: ComponentDetailPage,
});

export default function ComponentDetailPage() {
	const { id } = Route.useParams();
	const { data: component, isLoading, isError, error } = useComponent(id);
	const updateComponent = useUpdateComponent(id);
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function handleSubmit(values: ComponentFormValues) {
		setServerError(null);
		setSaved(false);
		try {
			await updateComponent.mutateAsync({
				name: values.nome,
			});
			setSaved(true);
		} catch (submitError) {
			if (submitError instanceof Error) {
				setServerError(submitError.message);
			}
		}
	}

	return (
		<DetailPage
			title={component?.name ?? "Dados do componente"}
			backTo={{ to: "/components", label: "Voltar para a lista" }}
			isLoading={isLoading}
			error={
				isError
					? error instanceof Error
						? error.message
						: "Falha ao carregar componente"
					: null
			}
		>
			{component && (
				<>
					{saved && (
						<p className="text-sm text-muted-foreground" role="status">
							Componente atualizado
						</p>
					)}
					<ComponentForm
						key={component.id + String(component.updatedAt)}
						defaultValues={{ nome: component.name }}
						onSubmit={handleSubmit}
						submitLabel="Salvar alterações"
						serverError={serverError}
					/>
				</>
			)}
		</DetailPage>
	);
}
