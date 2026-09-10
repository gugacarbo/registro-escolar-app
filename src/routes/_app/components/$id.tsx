import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
	ComponentForm,
	type ComponentFormValues,
} from "#/components/components/component-form";
import { Button } from "#/components/ui/button";
import { useComponent } from "#/hooks/components/use-component";
import { useUpdateComponent } from "#/hooks/components/use-update-component";

export const Route = createFileRoute("/_app/components/$id")({
	component: ComponentDetailPage,
});

export function ComponentDetailPage() {
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
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h1 className="text-2xl font-bold">
					{component?.name ?? "Dados do componente"}
				</h1>
				<Link to="/components">
					<Button variant="secondary">Voltar para a lista</Button>
				</Link>
			</div>
			{isLoading && <p>Carregando...</p>}
			{isError && (
				<p className="text-sm text-destructive">
					{error instanceof Error
						? error.message
						: "Falha ao carregar componente"}
				</p>
			)}
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
		</div>
	);
}
