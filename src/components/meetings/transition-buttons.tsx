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

const TRANSITIONS_BY_STATUS: Record<string, TransitionOption[]> = {
	draft: [
		{
			action: "start",
			label: "Iniciar",
			confirmationTitle: "Iniciar reunião",
			confirmationDescription:
				"A reunião passará para Em andamento e poderá receber registros.",
			confirmationLabel: "Confirmar início",
		},
	],
	in_progress: [
		{
			action: "finalize",
			label: "Finalizar",
			confirmationTitle: "Finalizar reunião",
			confirmationDescription:
				"A reunião será marcada como finalizada. Você poderá reabri-la depois se precisar alterar os registros.",
			confirmationLabel: "Confirmar finalização",
		},
	],
	finished: [
		{
			action: "reopen",
			label: "Reabrir",
			confirmationTitle: "Reabrir reunião",
			confirmationDescription:
				"A reunião voltará a aceitar alterações e deixará de constar como finalizada.",
			confirmationLabel: "Confirmar reabertura",
		},
	],
	reopened: [
		{
			action: "start",
			label: "Retomar",
			confirmationTitle: "Retomar reunião",
			confirmationDescription:
				"A reunião voltará para Em andamento e poderá receber novos registros.",
			confirmationLabel: "Confirmar retomada",
		},
		{
			action: "finalize",
			label: "Finalizar",
			confirmationTitle: "Finalizar reunião",
			confirmationDescription:
				"A reunião será marcada como finalizada. Você poderá reabri-la depois se precisar alterar os registros.",
			confirmationLabel: "Confirmar finalização",
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
						variant={option.action === "finalize" ? "outline" : "default"}
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
