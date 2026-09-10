import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { RoleForm, type RoleFormValues } from "#/components/roles/role-form";
import { Button } from "#/components/ui/button";
import { useRole } from "#/hooks/roles/use-role";
import { useUpdateRole } from "#/hooks/roles/use-update-role";

export const Route = createFileRoute("/_app/roles/$id")({
	component: RoleDetailPage,
});

export function RoleDetailPage() {
	const { id } = Route.useParams();
	const { data: role, isLoading, isError, error } = useRole(id);
	const updateRole = useUpdateRole(id);
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function handleSubmit(values: RoleFormValues) {
		setServerError(null);
		setSaved(false);
		try {
			await updateRole.mutateAsync({
				name: values.name,
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
				<h1 className="text-2xl font-bold">{role?.name ?? "Dados do papel"}</h1>
				<Link to="/roles">
					<Button variant="secondary">Voltar para a lista</Button>
				</Link>
			</div>
			{isLoading && <p>Carregando...</p>}
			{isError && (
				<p className="text-sm text-destructive">
					{error instanceof Error ? error.message : "Falha ao carregar papel"}
				</p>
			)}
			{role && (
				<>
					{saved && (
						<p className="text-sm text-muted-foreground" role="status">
							Papel atualizado
						</p>
					)}
					<RoleForm
						key={role.id + String(role.updatedAt)}
						defaultValues={{ name: role.name }}
						onSubmit={handleSubmit}
						submitLabel="Salvar alterações"
						serverError={serverError}
					/>
				</>
			)}
		</div>
	);
}
