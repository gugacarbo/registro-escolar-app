import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { TransitionAction } from "#/hooks/meetings/use-transition-meeting";
import { useTransitionMeeting } from "#/hooks/meetings/use-transition-meeting";

type TransitionOption = {
	action: TransitionAction;
	label: string;
	confirmationTitle: string;
	confirmationDescription: string;
	confirmationLabel: string;
};

// ADR-0021: o único estado explícito é a reabertura; o encerramento
// acontece ao gerar a ata.
const TRANSITIONS_BY_STATUS: Record<string, TransitionOption[]> = {
	closed: [
		{
			action: "reopen",
			label: "Reabrir",
			confirmationTitle: "Reabrir reunião",
			confirmationDescription:
				"A reunião voltará a aceitar alterações e deixará de constar como encerrada. Gere a ata novamente ao concluir.",
			confirmationLabel: "Confirmar reabertura",
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
	const [pendingOption, setPendingOption] = useState<TransitionOption | null>(
		null,
	);
	const options = TRANSITIONS_BY_STATUS[status] ?? [];

	async function handleConfirm() {
		if (!pendingOption) {
			return;
		}

		setError(null);

		try {
			await transition.mutateAsync(pendingOption.action);
			setPendingOption(null);
		} catch (transitionError) {
			if (transitionError instanceof Error) {
				setError(transitionError.message);
			} else {
				setError("Falha ao atualizar reunião");
			}
		}
	}

	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				{options.map((option) => (
					<Button
						key={option.action + option.label}
						type="button"
						variant="outline"
						disabled={transition.isPending}
						onClick={() => {
							setError(null);
							setPendingOption(option);
						}}
					>
						{option.label}
					</Button>
				))}
			</div>
			<Dialog
				open={pendingOption !== null}
				onOpenChange={(open) => {
					if (!open && !transition.isPending) {
						setPendingOption(null);
					}
				}}
			>
				<DialogContent showCloseButton={!transition.isPending}>
					<DialogHeader>
						<DialogTitle>{pendingOption?.confirmationTitle}</DialogTitle>
						<DialogDescription>
							{pendingOption?.confirmationDescription}
						</DialogDescription>
						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={transition.isPending}
							onClick={() => setPendingOption(null)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={transition.isPending}
							onClick={() => void handleConfirm()}
						>
							{pendingOption?.confirmationLabel}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
