import type { MeetingStatus, TransitionAction } from "./schema";

/**
 * Máquina de estados da reunião (spec 0005 / ADR-0021):
 * open → closed (ao gerar a ata) ; closed → open (reabertura explícita).
 */
export const ALLOWED_TRANSITIONS: Record<MeetingStatus, TransitionAction[]> = {
	open: [],
	closed: ["reopen"],
};

export const NEXT_STATUS: Record<TransitionAction, MeetingStatus> = {
	reopen: "open",
};

/**
 * A reunião só aceita trabalho enquanto está aberta. Em `closed` exige
 * reabertura (spec 0005, borda 1).
 */
export function canEditLinkedRecord(status: MeetingStatus): boolean {
	return status === "open";
}

export function canEditMeetingData(status: string): boolean {
	return status === "open";
}

/** Registros independentes de reunião são permitidos em qualquer estado. */
export function canCreateIndependentRecord(): boolean {
	return true;
}
