import { useState } from "react";

import { Button } from "#/components/ui/button";
import type { TransitionAction } from "#/hooks/meetings/use-transition-meeting";
import { useTransitionMeeting } from "#/hooks/meetings/use-transition-meeting";

type TransitionOption = {
	action: TransitionAction;
	label: string;
	confirmMessage: string;
};

const TRANSITIONS_BY_STATUS: Record<string, TransitionOption[]> = {
	draft: [
		{
			action: "start",
			label: "Iniciar",
			confirmMessage: "Iniciar a reunião?",
		},
	],
	in_progress: [
		{
			action: "finalize",
			label: "Finalizar",
			confirmMessage: "Finalizar a reunião?",
		},
	],
	finished: [
		{
			action: "reopen",
			label: "Reabrir",
			confirmMessage: "Reabrir a reunião?",
		},
	],
	reopened: [
		{
			action: "start",
			label: "Retomar",
			confirmMessage: "Retomar a reunião?",
		},
		{
			action: "finalize",
			label: "Finalizar",
			confirmMessage: "Finalizar a reunião?",
		},
	],
};

export function TransitionButtons({
	meetingId,
	status,
}: {
	meetingId: string;
	status: string;
}) {
	const transition = useTransitionMeeting(meetingId);
	const [error, setError] = useState<string | null>(null);
	const options = TRANSITIONS_BY_STATUS[status] ?? [];

	async function handleTransition(option: TransitionOption) {
		setError(null);
		if (!window.confirm(option.confirmMessage)) {
			return;
		}
		try {
			await transition.mutateAsync(option.action);
		} catch (transitionError) {
			if (transitionError instanceof Error) {
				setError(transitionError.message);
			} else {
				setError("Falha ao atualizar reunião");
			}
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{options.map((option) => (
				<Button
					key={option.action + option.label}
					type="button"
					variant={option.action === "finalize" ? "outline" : "default"}
					disabled={transition.isPending}
					onClick={() => void handleTransition(option)}
				>
					{option.label}
				</Button>
			))}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
