import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import {
	OfferForm,
	type OfferFormValues,
} from "#/components/offers/offer-form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useCreateOffer } from "#/hooks/offers/use-create-offer";

type CreateOfferDialogProps = {
	classId: string;
	turmaName?: string;
	trigger: ReactNode;
};

export function CreateOfferDialog({
	classId,
	turmaName,
	trigger,
}: CreateOfferDialogProps) {
	const [open, setOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createOffer = useCreateOffer();

	function handleOpenChange(next: boolean) {
		if (!next && isSubmitting) {
			return;
		}
		setOpen(next);
		if (!next) {
			setServerError(null);
		}
	}

	async function handleSubmit(values: OfferFormValues) {
		setServerError(null);
		setIsSubmitting(true);
		try {
			await createOffer.mutateAsync({
				turmaId: classId,
				componenteId: values.componenteId,
				professorIds: values.professorIds,
			});
			toast.success("Oferta criada");
			setOpen(false);
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova oferta</DialogTitle>
					<DialogDescription>
						Oferte um componente curricular para a turma e atribua professores.
					</DialogDescription>
				</DialogHeader>
				<OfferForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
					fixedTurma={{ id: classId, name: turmaName }}
				/>
			</DialogContent>
		</Dialog>
	);
}
