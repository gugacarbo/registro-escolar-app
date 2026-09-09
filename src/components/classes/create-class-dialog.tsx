import { type ReactNode, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useCreateClass } from "#/hooks/classes/use-create-class";

import { ClassForm, type ClassFormValues } from "./class-form";

type CreateClassDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: () => void;
};

export function CreateClassDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: CreateClassDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const createClass = useCreateClass();

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

	async function handleSubmit(values: ClassFormValues) {
		setServerError(null);
		try {
			await createClass.mutateAsync({
				nome: values.nome,
				periodoLetivo: values.periodoLetivo,
				...(values.curso ? { curso: values.curso } : {}),
				...(values.serie ? { serie: values.serie } : {}),
				...(values.turno ? { turno: values.turno } : {}),
			});
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
					<DialogTitle>Nova turma</DialogTitle>
					<DialogDescription>
						Preencha os dados para cadastrar uma turma.
					</DialogDescription>
				</DialogHeader>
				<ClassForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
