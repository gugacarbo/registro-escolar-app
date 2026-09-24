import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useUpdateClass } from "#/hooks/classes/use-update-class";
import type { Class } from "#/lib/classes/schema";

import { ClassForm, type ClassFormValues } from "./class-form";

type EditClassDialogProps = {
	classRow: Pick<
		Class,
		"id" | "name" | "academicPeriod" | "course" | "grade" | "shift"
	>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: () => void;
};

export function EditClassDialog({
	classRow,
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: EditClassDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const updateClass = useUpdateClass(classRow.id);

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
			await updateClass.mutateAsync({
				nome: values.nome,
				periodoLetivo: values.periodoLetivo,
				...(values.curso ? { curso: values.curso } : {}),
				...(values.serie ? { serie: values.serie } : {}),
				...(values.turno ? { turno: values.turno } : {}),
			});
			toast.success("Turma atualizada");
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
					<DialogTitle>Editar turma</DialogTitle>
					<DialogDescription>
						Atualize os dados da turma {classRow.name}.
					</DialogDescription>
				</DialogHeader>
				<ClassForm
					key={open ? classRow.id : "closed"}
					defaultValues={{
						nome: classRow.name,
						periodoLetivo: classRow.academicPeriod,
						curso: classRow.course ?? "",
						serie: classRow.grade ?? "",
						turno: classRow.shift ?? "",
					}}
					onSubmit={handleSubmit}
					submitLabel="Salvar alterações"
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
