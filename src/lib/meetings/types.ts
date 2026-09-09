import type { PaginatedResult } from "#/lib/pagination";

import type { Meeting, MeetingStatus } from "./schema";

export type ListMeetingsOptions = {
	limit?: number;
	offset?: number;
	search?: string;
	status?: MeetingStatus;
};

export type MeetingsPageResult = PaginatedResult<Meeting>;
