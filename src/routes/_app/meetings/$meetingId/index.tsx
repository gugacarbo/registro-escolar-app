import { createFileRoute, Link } from "@tanstack/react-router";

import { MeetingStatusBadge } from "#/components/meetings/meeting-status-badge";
import { TransitionButtons } from "#/components/meetings/transition-buttons";
import { Button } from "#/components/ui/button";
import { useMeeting } from "#/hooks/meetings/use-meeting";

export const Route = createFileRoute("/_app/meetings/$meetingId/")({
	component: MeetingDetailPage,
});

function MeetingDetailPage() {
	const { meetingId } = Route.useParams();
	const { data: meeting, isLoading } = useMeeting(meetingId);

	return (
		<div className="space-y-4">
			{isLoading && <p>Carregando...</p>}
			{meeting && (
				<>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<MeetingStatusBadge status={meeting.status} />
							<h1 className="text-2xl font-bold">{meeting.title}</h1>
						</div>
						<TransitionButtons meetingId={meeting.id} status={meeting.status} />
					</div>
					<div className="space-y-1 text-sm">
						<p>
							<span className="font-medium">Data: </span>
							{meeting.heldAt
								? new Date(meeting.heldAt).toLocaleDateString("pt-BR")
								: "Não informada"}
						</p>
					</div>
					{meeting.status === "finished" && (
						<p
							className="rounded border bg-secondary p-2 text-sm"
							role="status"
						>
							Reunião finalizada — reabra para editar
						</p>
					)}
					<div className="flex flex-wrap gap-2">
						<Link to="/meetings/$meetingId/council" params={{ meetingId }}>
							<Button variant="secondary">Conselho</Button>
						</Link>
						<Link to="/meetings/$meetingId/participants" params={{ meetingId }}>
							<Button variant="secondary">Participantes</Button>
						</Link>
					</div>
				</>
			)}
		</div>
	);
}
