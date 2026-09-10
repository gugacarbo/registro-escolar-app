import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { StaffForm, type StaffFormValues } from "#/components/staff/staff-form";
import { Button } from "#/components/ui/button";
import { useStaffMember } from "#/hooks/staff/use-staff-member";
import { useUpdateStaffMember } from "#/hooks/staff/use-update-staff-member";

export const Route = createFileRoute("/_app/staff/$id")({
	component: StaffDetailPage,
});

export function StaffDetailPage() {
	const { id } = Route.useParams();
	const { data: member, isLoading, isError, error } = useStaffMember(id);
	const updateMember = useUpdateStaffMember(id);
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function handleSubmit(values: StaffFormValues) {
		setServerError(null);
		setSaved(false);
		try {
			await updateMember.mutateAsync({
				name: values.name,
				email: values.email || null,
				phone: values.phone || null,
				notes: values.notes || null,
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
					{member?.name ?? "Dados do servidor"}
				</h1>
				<Link to="/staff">
					<Button variant="secondary">Voltar para a lista</Button>
				</Link>
			</div>
			{isLoading && <p>Carregando...</p>}
			{isError && (
				<p className="text-sm text-destructive">
					{error instanceof Error
						? error.message
						: "Falha ao carregar servidor"}
				</p>
			)}
			{member && (
				<>
					{saved && (
						<p className="text-sm text-muted-foreground" role="status">
							Servidor atualizado
						</p>
					)}
					<StaffForm
						key={member.id + String(member.updatedAt)}
						defaultValues={{
							name: member.name,
							email: member.email ?? "",
							phone: member.phone ?? "",
							notes: member.notes ?? "",
						}}
						onSubmit={handleSubmit}
						submitLabel="Salvar alterações"
						serverError={serverError}
					/>
				</>
			)}
		</div>
	);
}
