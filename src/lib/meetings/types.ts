import type { MeetingStatus } from "./schema";

export type ListMeetingsOptions = {
	limit?: number;
	offset?: number;
	search?: string;
	status?: MeetingStatus;
};
