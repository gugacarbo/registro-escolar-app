import type { minutes, minuteTemplates, minuteVersions } from "#/db/schema";

export type { MinuteApprovalStatus } from "./schema";

import type { MinuteApprovalStatus } from "./schema";

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

export type ListMinutesOptions = {
	limit?: number;
	offset?: number;
	search?: string;
	approvalStatus?: MinuteApprovalStatus;
};

export type MinuteListItem = {
	id: string;
	meetingId: string;
	meetingTitle: string;
	templateName: string | null;
	approvalStatus: MinuteApprovalStatus;
	approvedAt: string | null;
	currentVersion: number | null;
	updatedAt: string;
};
