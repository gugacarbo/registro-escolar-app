import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { StaffForm, type StaffFormValues } from "#/components/staff/staff-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { useDeleteStaffMember } from "#/hooks/staff/use-delete-staff-member";
import { useStaffMember } from "#/hooks/staff/use-staff-member";
import { useUpdateStaffMember } from "#/hooks/staff/use-update-staff-member";

export const Route = createFileRoute("/_app/staff/$id")({
	component: StaffDetailPage,
});

export function StaffDetailPage() {
	const { id } = Route.useParams();
	const { data: member, isLoading, isError, error } = useStaffMember(id);
	const updateMember = useUpdateStaffMember(id);
	const navigate = useNavigate();
	const deleteMember = useDeleteStaffMember(id);
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

	async function handleDelete() {
		setServerError(null);
		try {
			await deleteMember.mutateAsync();
			await navigate({ to: "/staff" });
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
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
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" disabled={deleteMember.isPending}>
								Remover servidor
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Remover servidor?</AlertDialogTitle>
								<AlertDialogDescription>
									O servidor será ocultado das listagens ativas. Esta operação
									não exclui o histórico.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction onClick={() => void handleDelete()}>
									Remover
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			)}
		</div>
	);
}
