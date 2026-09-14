import { useState } from "react";

import { GeneralReportForm } from "#/components/meetings/general-report-form";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";

type GeneralReportDialogProps = {
	meetingId: string;
	onSubmit: (values: {
		texto: string;
		origemId: string | null;
		incluirNaAta: boolean;
	}) => void | boolean | Promise<void | boolean>;
	disabled?: boolean;
	serverError?: string | null;
	draftKey?: string;
	onOpenChange?: (open: boolean) => void;
};

export function GeneralReportDialog({
	meetingId,
	onSubmit,
	disabled,
	serverError,
	draftKey,
	onOpenChange,
}: GeneralReportDialogProps) {
	const [open, setOpen] = useState(false);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		onOpenChange?.(nextOpen);
	}

	async function handleSubmit(values: Parameters<typeof onSubmit>[0]) {
		const result = await onSubmit(values);
		if (result !== false) handleOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button type="button" disabled={disabled}>
					Novo relato geral
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Novo relato geral</DialogTitle>
					<DialogDescription>
						Registre uma observação sobre a turma ou a reunião como um todo.
					</DialogDescription>
				</DialogHeader>
				<GeneralReportForm
					key={open ? "open" : "closed"}
					meetingId={meetingId}
					onSubmit={handleSubmit}
					submitLabel="Adicionar relato"
					disabled={disabled}
					serverError={serverError}
					draftKey={draftKey}
				/>
			</DialogContent>
		</Dialog>
	);
}
