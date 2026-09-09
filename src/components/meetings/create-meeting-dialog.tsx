import { type ReactNode, useState } from "react";

import {
	MeetingForm,
	type MeetingFormValues,
} from "#/components/meetings/meeting-form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useCreateMeeting } from "#/hooks/meetings/use-create-meeting";

type CreateMeetingDialogProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	onSuccess?: (meetingId: string) => void;
};

export function CreateMeetingDialog({
	open: controlledOpen,
	onOpenChange,
	trigger,
	onSuccess,
}: CreateMeetingDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const createMeeting = useCreateMeeting();

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

	async function handleSubmit(values: MeetingFormValues) {
		setServerError(null);
		try {
			const meeting = await createMeeting.mutateAsync({
				title: values.nome,
				...(values.data ? { heldAt: values.data } : {}),
				...(values.templateId ? { templateId: values.templateId } : {}),
				classIds: values.turmaIds,
				participants: values.participantes
					.filter(
						(participant) => participant.servidorId && participant.papelId,
					)
					.map((participant) => ({
						staffId: participant.servidorId,
						roleId: participant.papelId,
					})),
			});
			handleOpenChange(false);
			onSuccess?.(meeting.id);
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Nova reunião</DialogTitle>
					<DialogDescription>
						Preencha os dados para cadastrar uma reunião.
					</DialogDescription>
				</DialogHeader>
				<MeetingForm
					key={open ? "open" : "closed"}
					onSubmit={handleSubmit}
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
