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
import { useCreateComponent } from "#/hooks/components/use-create-component";

import { ComponentForm, type ComponentFormValues } from "./component-form";

type CreateComponentDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: () => void;
};

export function CreateComponentDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: CreateComponentDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const createComponent = useCreateComponent();

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

	async function handleSubmit(values: ComponentFormValues) {
		setServerError(null);
		try {
			await createComponent.mutateAsync({ name: values.nome });
			toast.success("Componente cadastrado");
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
					<DialogTitle>Novo componente</DialogTitle>
					<DialogDescription>
						Preencha os dados para cadastrar um componente.
					</DialogDescription>
				</DialogHeader>
				<ComponentForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
