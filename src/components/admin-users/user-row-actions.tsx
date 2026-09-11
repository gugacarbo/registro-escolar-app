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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useDeleteUser } from "#/hooks/admin-users/use-delete-user";
import { useUpdateUserRole } from "#/hooks/admin-users/use-update-user-role";
import type { AdminUser } from "#/lib/admin-users/schema";

type UserRowActionsProps = {
	user: AdminUser;
	currentUserId?: string;
};

function errorText(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

export function UserRowActions({ user, currentUserId }: UserRowActionsProps) {
	const isSelf = currentUserId !== undefined && user.id === currentUserId;
	const isOtherAdmin = user.role === "admin";
	const nextRole = user.role === "admin" ? "user" : "admin";

	const roleActionDisabled =
		isSelf || user.isPermanentAdmin || (nextRole === "admin" && isOtherAdmin);
	const roleActionReason = isSelf
		? "Você não pode alterar a própria conta"
		: user.isPermanentAdmin
			? "O administrador permanente não pode ser alterado"
			: "É possível alterar apenas o papel de usuários comuns";

	const deleteDisabled = isSelf || user.isPermanentAdmin || isOtherAdmin;
	const deleteReason = isSelf
		? "Você não pode excluir a própria conta"
		: user.isPermanentAdmin
			? "O administrador permanente não pode ser excluído"
			: "É possível excluir apenas usuários comuns";

	const updateRole = useUpdateUserRole(user.id);
	const deleteUser = useDeleteUser(user.id);
	const isBusy = updateRole.isPending || deleteUser.isPending;

	async function handleRoleToggle() {
		try {
			await updateRole.mutateAsync({ role: nextRole });
			toast.success(
				nextRole === "admin"
					? "Usuário promovido a admin"
					: "Usuário rebaixado para user",
			);
		} catch (error) {
			toast.error(errorText(error, "Falha ao atualizar o papel"));
		}
	}

	async function handleDelete() {
		try {
			await deleteUser.mutateAsync();
			toast.success("Usuário excluído");
		} catch (error) {
			toast.error(errorText(error, "Falha ao excluir o usuário"));
		}
	}

	const roleAction = (
		<Button
			variant="outline"
			size="sm"
			disabled={roleActionDisabled || isBusy}
			onClick={() => void handleRoleToggle()}
			aria-label={`${
				nextRole === "admin" ? "Tornar admin" : "Tornar user"
			} ${user.name}`}
		>
			{nextRole === "admin" ? "Tornar admin" : "Tornar user"}
		</Button>
	);

	const deleteAction = (
		<Button
			variant="destructive"
			size="sm"
			disabled={deleteDisabled || isBusy}
			aria-label={`Excluir ${user.name}`}
		>
			Excluir
		</Button>
	);

	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			{roleActionDisabled ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex">{roleAction}</span>
					</TooltipTrigger>
					<TooltipContent>{roleActionReason}</TooltipContent>
				</Tooltip>
			) : (
				roleAction
			)}
			{deleteDisabled ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex">{deleteAction}</span>
					</TooltipTrigger>
					<TooltipContent>{deleteReason}</TooltipContent>
				</Tooltip>
			) : (
				<AlertDialog>
					<AlertDialogTrigger asChild>{deleteAction}</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
							<AlertDialogDescription>
								A conta {user.name} será removida, e todas as sessões e
								credenciais vinculadas serão encerradas.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction onClick={() => void handleDelete()}>
								Excluir
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}
