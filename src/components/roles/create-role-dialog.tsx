import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { RoleForm, type RoleFormValues } from "#/components/roles/role-form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useCreateRole } from "#/hooks/roles/use-create-role";

type CreateRoleDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: () => void;
};

export function CreateRoleDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: CreateRoleDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const createRole = useCreateRole();

	const open = controlledOpen ?? uncontrolledOpen;

	function handleOpenChange(next: boolean) {
		if (controlledOpen === undefined) {
			setUncontrolledOpen(next);
		}
		if (!next) {
			setServerError(null);
		}
		onOpenChange?.(next);
	}

	async function handleSubmit(values: RoleFormValues) {
		setServerError(null);
		try {
			await createRole.mutateAsync(values);
			toast.success("Cargo cadastrado");
			handleOpenChange(false);
			onSuccess?.();
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo cargo</DialogTitle>
					<DialogDescription>
						Preencha os dados para cadastrar um cargo.
					</DialogDescription>
				</DialogHeader>
				<RoleForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
