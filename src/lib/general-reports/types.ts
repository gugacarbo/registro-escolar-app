export type GeneralReportRowJson = {
	id: string;
	meetingId: string;
	originId: string | null;
	categoryId: string | null;
	texto: string;
	includeInMinutes: boolean;
	createdAt: string;
	updatedAt: string;
};

export function serializeGeneralReport(row: {
	id: string;
	meetingId: string;
	originId: string | null;
	categoryId: string | null;
	texto: string;
	includeInMinutes: boolean;
	createdAt: Date;
	updatedAt: Date;
}): GeneralReportRowJson {
	return {
		id: row.id,
		meetingId: row.meetingId,
		originId: row.originId,
		categoryId: row.categoryId,
		texto: row.texto,
		includeInMinutes: row.includeInMinutes,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}
