import { type ReactNode, useState } from "react";

import { StaffForm, type StaffFormValues } from "#/components/staff/staff-form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useCreateStaff } from "#/hooks/staff/use-create-staff";

type CreateStaffDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: () => void;
};

export function CreateStaffDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: CreateStaffDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const createStaff = useCreateStaff();

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

	async function handleSubmit(values: StaffFormValues) {
		setServerError(null);
		try {
			await createStaff.mutateAsync(values);
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
					<DialogTitle>Novo servidor</DialogTitle>
					<DialogDescription>
						Preencha os dados para cadastrar um servidor.
					</DialogDescription>
				</DialogHeader>
				<StaffForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
