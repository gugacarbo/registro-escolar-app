import { type ReactNode, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useCreateStudent } from "#/hooks/students/use-create-student";

import { StudentForm, type StudentFormValues } from "./student-form";

type CreateStudentDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: () => void;
};

export function CreateStudentDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: CreateStudentDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const createStudent = useCreateStudent();

	const open = controlledOpen ?? uncontrolledOpen;

	function handleOpenChange(next: boolean) {
		if (!controlledOpen) {
			setUncontrolledOpen(next);
		}
		if (!next) {
			setServerError(null);
		}
		onOpenChange?.(next);
	}

	async function handleSubmit(values: StudentFormValues) {
		setServerError(null);
		try {
			await createStudent.mutateAsync({
				...values,
				document: values.document || undefined,
				registrationNumber: values.registrationNumber || undefined,
				email: values.email || undefined,
				phone: values.phone || undefined,
				birthDate: values.birthDate || undefined,
				notes: values.notes || undefined,
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
					<DialogTitle>Novo estudante</DialogTitle>
					<DialogDescription>
						Preencha os dados para cadastrar um estudante.
					</DialogDescription>
				</DialogHeader>
				<StudentForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
