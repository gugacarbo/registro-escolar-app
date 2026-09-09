import type { TrackingStatus } from "./schema";

export type MeetingClassStudent = {
	studentId: string;
	name: string;
	document: string | null;
	registrationNumber: string | null;
	status: TrackingStatus;
	statusUpdatedAt: Date | null;
};

export type TrackingCounters = {
	total: number;
	pendente: number;
	em_discussao: number;
	concluido: number;
	nao_discutido: number;
};

export type MeetingClassStudentsResult = {
	students: MeetingClassStudent[];
	counters: TrackingCounters;
	nextPendingStudentId: string | null;
};

export type MeetingProgress = {
	total: number;
	concluded: number;
	percentage: number;
	completed: boolean;
};
