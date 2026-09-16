import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { RoleForm, type RoleFormValues } from "#/components/roles/role-form";
import { DetailPage } from "#/components/ui/page-recipes";
import { useRole } from "#/hooks/roles/use-role";
import { useUpdateRole } from "#/hooks/roles/use-update-role";

export const Route = createFileRoute("/_app/roles/$id")({
	component: RoleDetailPage,
});

export default function RoleDetailPage() {
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
		<DetailPage
			title={role?.name ?? "Dados do papel"}
			backTo={{ to: "/roles", label: "Voltar para a lista" }}
			isLoading={isLoading}
			error={
				isError
					? error instanceof Error
						? error.message
						: "Falha ao carregar papel"
					: null
			}
		>
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
		</DetailPage>
	);
}
