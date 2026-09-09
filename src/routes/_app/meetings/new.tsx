import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import type { MeetingFormValues } from "#/components/meetings/meeting-form";
import { MeetingForm } from "#/components/meetings/meeting-form";
import { useCreateMeeting } from "#/hooks/meetings/use-create-meeting";

export const Route = createFileRoute("/_app/meetings/new")({
	component: NewMeetingPage,
});

function NewMeetingPage() {
	const navigate = useNavigate();
	const createMeeting = useCreateMeeting();
	const [serverError, setServerError] = useState<string | null>(null);

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
			void navigate({
				to: "/meetings/$meetingId",
				params: { meetingId: meeting.id },
			});
		} catch (error) {
			if (error instanceof Error) {
				setServerError(error.message);
			}
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4">
			<h1 className="text-2xl font-bold">Nova reunião</h1>
			<MeetingForm onSubmit={handleSubmit} serverError={serverError} />
		</div>
	);
}
