import { createFileRoute } from "@tanstack/react-router";

import { TransitionButtons } from "#/components/meetings/transition-buttons";
import { Button } from "#/components/ui/button";
import { useMeeting } from "#/hooks/meetings/use-meeting";

export const Route = createFileRoute("/_app/meetings/$meetingId/council")({
	component: CouncilPage,
});

function CouncilPage() {
	const { meetingId } = Route.useParams();
	const { data: meeting, isLoading } = useMeeting(meetingId);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Conselho de classe</h1>
			{isLoading && <p>Carregando...</p>}
			{meeting && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="font-medium">{meeting.title}</span>
					<TransitionButtons meetingId={meeting.id} status={meeting.status} />
				</div>
			)}
			<section className="space-y-2">
				<h2 className="text-lg font-semibold">Turmas</h2>
				<p className="text-sm text-muted-foreground">
					Lista de estudantes por turma disponível após spec 0007
				</p>
			</section>
			<section className="space-y-2">
				<h2 className="text-lg font-semibold">Registros independentes</h2>
				<p className="text-sm text-muted-foreground">
					Registros independentes aparecem aqui — spec 0007
				</p>
			</section>
			<Button
				disabled
				title="Disponível após specs 0006/0007 — usará canEditLinkedRecord()"
			>
				Novo registro vinculado
			</Button>
		</div>
	);
}
