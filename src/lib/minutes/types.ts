import type { minutes, minuteTemplates, minuteVersions } from "#/db/schema";

export type MinuteRow = typeof minutes.$inferSelect;
export type MinuteVersionRow = typeof minuteVersions.$inferSelect;
export type MinuteTemplateRow = typeof minuteTemplates.$inferSelect;

export type MinuteVersionJson = {
	id: string;
	minuteId: string;
	version: number;
	isCurrent: boolean;
	notes: string | null;
	createdAt: string;
	hasPdf: boolean;
};

export type MinutePreviewJson = {
	meetingId: string;
	templateId: string | null;
	status: string;
	approvalStatus: string;
	content: string;
};

export type GenerateMinuteJson = {
	minuteId: string;
	version: number;
	isCurrent: boolean;
	createdAt: string;
	approvalStatus: string;
	pdfSize: number;
};
