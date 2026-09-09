import type { MeetingStatus, TransitionAction } from "./schema";

// Máquina de estados da reunião (spec 0005):
// draft → in_progress → finished → reopened (→ in_progress → finished …)
export const ALLOWED_TRANSITIONS: Record<MeetingStatus, TransitionAction[]> = {
	draft: ["start"],
	in_progress: ["finalize"],
	finished: ["reopen"],
	reopened: ["start", "finalize"],
};

export const NEXT_STATUS: Record<TransitionAction, MeetingStatus> = {
	start: "in_progress",
	finalize: "finished",
	reopen: "reopened",
};

export function canEditLinkedRecord(status: MeetingStatus): boolean {
	// Integração com as specs 0006/0007 (registros vinculados):
	// atas e registros só podem ser criados/editados enquanto a
	// reunião está em andamento ou reaberta (borda 1).
	return status === "in_progress" || status === "reopened";
}

export function canCreateIndependentRecord(): boolean {
	// Borda 6: registro independente de reunião é permitido em
	// qualquer estado do ciclo de vida.
	return true;
}
