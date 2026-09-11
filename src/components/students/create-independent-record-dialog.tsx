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
import { useCreateIndependentRecord } from "#/hooks/records/use-create-independent-record";

import {
	IndependentRecordForm,
	type IndependentRecordFormSubmitValues,
} from "./independent-record-form";

type CreateIndependentRecordDialogProps = {
	studentId: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
};

export function CreateIndependentRecordDialog({
	studentId,
	open: controlledOpen,
	onOpenChange,
	trigger,
}: CreateIndependentRecordDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const createRecord = useCreateIndependentRecord();

	const open = controlledOpen ?? uncontrolledOpen;

	function handleOpenChange(next: boolean) {
		if (!controlledOpen) {
			setUncontrolledOpen(next);
		}
		onOpenChange?.(next);
	}

	async function handleSubmit(values: IndependentRecordFormSubmitValues) {
		try {
			await createRecord.mutateAsync({
				studentId,
				...values,
			});
			toast.success("Registro criado");
			handleOpenChange(false);
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			}
			throw error;
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Novo registro</DialogTitle>
					<DialogDescription>
						Adicione um registro histórico independente, fora de uma reunião.
					</DialogDescription>
				</DialogHeader>
				<IndependentRecordForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					submitLabel="Criar registro"
					disabled={createRecord.isPending}
				/>
			</DialogContent>
		</Dialog>
	);
}
