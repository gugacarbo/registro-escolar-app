import { useState } from "react";

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
import { useUpdateMeeting } from "#/hooks/meetings/use-update-meeting";
import type { Meeting } from "#/lib/meetings/schema";

function toDateInput(value: string | null | undefined) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
}

export function EditMeetingDialog({ meeting }: { meeting: Meeting }) {
	const [open, setOpen] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const updateMeeting = useUpdateMeeting(meeting.id);

	async function handleSubmit(values: MeetingFormValues) {
		setServerError(null);
		try {
			await updateMeeting.mutateAsync({
				title: values.nome,
				heldAt: values.data || undefined,
				templateId: values.templateId || null,
			});
			setOpen(false);
		} catch (error) {
			if (error instanceof Error) setServerError(error.message);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button type="button" className="text-sm underline">
					Editar dados
				</button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Editar reunião</DialogTitle>
					<DialogDescription>
						Atualize dados gerais da reunião.
					</DialogDescription>
				</DialogHeader>
				<MeetingForm
					key={open ? meeting.id : "closed"}
					defaultValues={{
						nome: meeting.title,
						data: toDateInput(meeting.heldAt?.toString()),
						templateId: meeting.templateId ?? "",
						turmaIds: [],
						participantes: [],
					}}
					onSubmit={handleSubmit}
					submitLabel="Salvar alterações"
					serverError={serverError}
				/>
			</DialogContent>
		</Dialog>
	);
}
