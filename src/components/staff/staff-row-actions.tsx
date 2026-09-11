import { toast } from "sonner";

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
import type { StaffMember } from "#/lib/staff/schema";

export function StaffRowActions({ member }: { member: StaffMember }) {
	const deleteMember = useDeleteStaffMember(member.id);

	async function handleDelete() {
		try {
			await deleteMember.mutateAsync();
			toast.success("Servidor removido");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Falha ao remover servidor",
			);
		}
	}

	return (
		<div className="flex items-center justify-end">
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="destructive"
						size="sm"
						disabled={deleteMember.isPending}
						aria-label={`Remover ${member.name}`}
					>
						Remover
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover servidor?</AlertDialogTitle>
						<AlertDialogDescription>
							O servidor será ocultado das listagens ativas. Esta operação não
							exclui o histórico de participações.
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
		</div>
	);
}
