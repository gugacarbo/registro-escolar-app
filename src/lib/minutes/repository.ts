import { and, asc, eq, inArray, isNull, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import {
	generalReports,
	meetingClasses,
	meetingParticipants,
	meetings,
	minutes,
	minuteTemplates,
	minuteVersions,
	recordMeetingInclusions,
	studentRecords,
} from "#/db/schema";
import { findMeetingById, updateMeeting } from "#/lib/meetings/repository";
import type { Meeting } from "#/lib/meetings/schema";

import {
	ERR_MEETING_CLOSED,
	ERR_MEETING_NOT_CLOSED,
	ERR_MEETING_NOT_FOUND,
	ERR_MINUTE_ALREADY_APPROVED,
	ERR_MINUTE_NOT_FOUND,
	ERR_NO_CURRENT_VERSION,
	ERR_PDF_NOT_AVAILABLE,
	ERR_TEMPLATE_NOT_FOUND,
	ERR_VERSION_NOT_FOUND,
	MeetingClosedError,
	MeetingNotClosedError,
	MeetingNotFoundError,
	MinuteAlreadyApprovedError,
	MinuteNotEditableError,
	MinuteNotFoundError,
	MinuteTemplateNotFoundError,
	MinuteVersionNotFoundError,
	NoCurrentVersionError,
	PdfNotAvailableError,
} from "./errors";
import { buildMinutePdf, pdfBytesToBuffer } from "./pdf";
import {
	renderedToPlainText,
	renderMinute,
	serializeVersionRow,
} from "./render";
import type { MinuteApprovalStatus, UpdateMinuteContentInput } from "./schema";
import { defaultMinuteBodyContent, emptyDoc } from "./tiptap/serializer";
import type {
	ListMinutesOptions,
	MinuteEditableContentJson,
	MinuteListItem,
	MinuteRow,
	MinuteTemplateRow,
} from "./types";

// ---------------------------------------------------------------------------
// Templates (spec 0009)
// ---------------------------------------------------------------------------

export async function createMinuteTemplate(
	db: DB,
	input: {
		name: string;
		headerContent?: string | object;
		bodyContent?: string | object;
		footerContent?: string | object;
		showMeeting?: boolean;
		showClasses?: boolean;
		showParticipants?: boolean;
		showRecords?: boolean;
		showGeneralReports?: boolean;
		showSignatures?: boolean;
	},
) {
	return db
		.insert(minuteTemplates)
		.values({
			id: crypto.randomUUID(),
			name: input.name,
			headerContent:
				typeof input.headerContent === "object" && input.headerContent != null
					? JSON.stringify(input.headerContent)
					: input.headerContent,
			bodyContent:
				typeof input.bodyContent === "object" && input.bodyContent != null
					? JSON.stringify(input.bodyContent)
					: input.bodyContent,
			footerContent:
				typeof input.footerContent === "object" && input.footerContent != null
					? JSON.stringify(input.footerContent)
					: input.footerContent,
			showMeeting: input.showMeeting,
			showClasses: input.showClasses,
			showParticipants: input.showParticipants,
			showRecords: input.showRecords,
			showGeneralReports: input.showGeneralReports,
			showSignatures: input.showSignatures,
		})
		.returning()
		.get();
}

export async function findMinuteTemplateById(db: DB, id: string) {
	return db.query.minuteTemplates.findFirst({
		where: eq(minuteTemplates.id, id),
	});
}

export async function listMinuteTemplates(db: DB) {
	return db.query.minuteTemplates.findMany({
		orderBy: [asc(minuteTemplates.name)],
	});
}

export async function updateMinuteTemplate(
	db: DB,
	id: string,
	input: {
		name: string;
		headerContent?: string | object;
		bodyContent?: string | object;
		footerContent?: string | object;
		showMeeting?: boolean;
		showClasses?: boolean;
		showParticipants?: boolean;
		showRecords?: boolean;
		showGeneralReports?: boolean;
		showSignatures?: boolean;
	},
) {
	return db
		.update(minuteTemplates)
		.set({
			name: input.name,
			headerContent:
				typeof input.headerContent === "object" && input.headerContent != null
					? JSON.stringify(input.headerContent)
					: input.headerContent,
			bodyContent:
				typeof input.bodyContent === "object" && input.bodyContent != null
					? JSON.stringify(input.bodyContent)
					: input.bodyContent,
			footerContent:
				typeof input.footerContent === "object" && input.footerContent != null
					? JSON.stringify(input.footerContent)
					: input.footerContent,
			showMeeting: input.showMeeting,
			showClasses: input.showClasses,
			showParticipants: input.showParticipants,
			showRecords: input.showRecords,
			showGeneralReports: input.showGeneralReports,
			showSignatures: input.showSignatures,
		})
		.where(eq(minuteTemplates.id, id))
		.returning()
		.get();
}

// ---------------------------------------------------------------------------
// Lista de atas (todos os registros, com busca por reunião e filtro de
// aprovação; padrão de paginação do app)
// ---------------------------------------------------------------------------

async function findMeetingIdsMatchingSearch(db: DB, term: string) {
	const rows = await db
		.select()
		.from(meetings)
		.where(like(meetings.title, sql`'%' || ${term} || '%'`));
	return rows.map((row) => row.id);
}

function buildMinutesListWhere(options: {
	meetingIds: string[] | null;
	approvalStatus?: MinuteApprovalStatus;
}) {
	const conditions = [];
	if (options.meetingIds !== null) {
		// Busca sem casamentos não retorna atas (restrito às reuniões casadas).
		conditions.push(
			inArray(
				minutes.meetingId,
				options.meetingIds.length > 0
					? options.meetingIds
					: ["__sem-reuniao__"],
			),
		);
	}
	if (options.approvalStatus) {
		conditions.push(eq(minutes.approvalStatus, options.approvalStatus));
	}
	return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listMinutes(
	db: DB,
	options: ListMinutesOptions = {},
): Promise<MinuteListItem[]> {
	const { limit = 50, offset = 0, search, approvalStatus } = options;
	const term = search?.trim();
	const where = buildMinutesListWhere({
		meetingIds: term ? await findMeetingIdsMatchingSearch(db, term) : null,
		approvalStatus,
	});
	const rows = await db.query.minutes.findMany({
		where,
		with: { meeting: true, template: true },
		orderBy: (minutes, { desc }) => [desc(minutes.updatedAt)],
		limit,
		offset,
	});
	const currentVersions =
		rows.length > 0
			? await db.query.minuteVersions.findMany({
					where: and(
						inArray(
							minuteVersions.minuteId,
							rows.map((row) => row.id),
						),
						eq(minuteVersions.isCurrent, true),
					),
				})
			: [];
	const versionByMinute = new Map(
		currentVersions.map((row) => [row.minuteId, row.version]),
	);
	return rows.map((row) => ({
		id: row.id,
		meetingId: row.meetingId,
		meetingTitle: row.meeting?.title ?? "",
		templateName: row.template?.name ?? null,
		approvalStatus: row.approvalStatus as MinuteApprovalStatus,
		approvedAt: row.approvedAt?.toISOString() ?? null,
		currentVersion: versionByMinute.get(row.id) ?? null,
		updatedAt: row.updatedAt.toISOString(),
	}));
}

export async function countMinutes(
	db: DB,
	options: Pick<ListMinutesOptions, "search" | "approvalStatus"> = {},
): Promise<number> {
	const { search, approvalStatus } = options;
	const term = search?.trim();
	const where = buildMinutesListWhere({
		meetingIds: term ? await findMeetingIdsMatchingSearch(db, term) : null,
		approvalStatus,
	});
	return db.$count(minutes, where);
}

// ---------------------------------------------------------------------------
// Coleta de dados (bordas 4/5 da spec 0009: sem internos; agrupar por turma)
// ---------------------------------------------------------------------------

export type MinuteDataInput = {
	classes: { className: string }[];
	participants: { staffName: string; roleName: string }[];
	records: { className: string | null; studentName: string; texto: string }[];
	generalReports: { texto: string }[];
};

export async function collectMinuteData(
	db: DB,
	meetingId: string,
): Promise<MinuteDataInput> {
	const participantRows = (
		await db.query.meetingParticipants.findMany({
			where: eq(meetingParticipants.meetingId, meetingId),
			with: { staff: true, role: true },
			orderBy: (row, { asc }) => [asc(row.createdAt)],
		})
	).map((row) => ({
		staffName: row.staff.name,
		roleName: row.role.name,
	}));
	const classRows = (
		await db.query.meetingClasses.findMany({
			where: eq(meetingClasses.meetingId, meetingId),
			with: { class: true },
		})
	).map((row) => ({
		classId: row.class.id,
		className: row.class.name,
	}));
	// Borda 4: registros internos (includeInMinutes=false) ficam de fora.
	const linked = (
		await db.query.studentRecords.findMany({
			where: and(
				eq(studentRecords.meetingId, meetingId),
				eq(studentRecords.includeInMinutes, true),
			),
			with: { student: true, class: true },
			orderBy: (row, { asc }) => [asc(row.createdAt)],
		})
	).map((row) => ({
		className: row.class?.name ?? null,
		studentName: row.student.name,
		texto: row.texto,
	}));
	// Registros independentes aplicáveis (spec 0007: turma da reunião ou sem
	// turma), com inclusão por reunião (CA-009).
	const meetingClassIds = classRows.map((row) => row.classId);
	const independentRows = await db.query.studentRecords.findMany({
		where: and(
			isNull(studentRecords.meetingId),
			...(meetingClassIds.length > 0
				? [inArray(studentRecords.classId, meetingClassIds)]
				: []),
		),
		with: { student: true, class: true },
	});
	const noClassRows =
		meetingClassIds.length > 0
			? await db.query.studentRecords.findMany({
					where: and(
						isNull(studentRecords.meetingId),
						isNull(studentRecords.classId),
					),
					with: { student: true, class: true },
				})
			: [];
	const independents = [...independentRows, ...noClassRows].map((row) => ({
		id: row.id,
		className: row.class?.name ?? null,
		studentName: row.student.name,
		texto: row.texto,
	}));
	const candidateIndependents = independents;
	const inclusionRows =
		candidateIndependents.length > 0
			? await db
					.select()
					.from(recordMeetingInclusions)
					.where(
						and(
							eq(recordMeetingInclusions.meetingId, meetingId),
							inArray(
								recordMeetingInclusions.studentRecordId,
								candidateIndependents.map((row) => row.id),
							),
						),
					)
			: [];
	const excluded = new Set(
		inclusionRows
			.filter((row) => !row.include)
			.map((row) => row.studentRecordId),
	);

	const reportRows = await db.query.generalReports.findMany({
		where: and(
			eq(generalReports.meetingId, meetingId),
			eq(generalReports.includeInMinutes, true),
		),
		orderBy: (row, { asc }) => [asc(row.createdAt)],
	});
	return {
		classes: classRows.map((row) => ({ className: row.className })),
		participants: participantRows,
		records: [
			...linked,
			...candidateIndependents.filter((row) => !excluded.has(row.id)),
		],
		generalReports: reportRows,
	};
}

async function resolveTemplate(db: DB, meeting: Meeting) {
	if (meeting.templateId) {
		const template = await findMinuteTemplateById(db, meeting.templateId);
		if (!template) {
			throw new MinuteTemplateNotFoundError(ERR_TEMPLATE_NOT_FOUND);
		}
		return template;
	}
	return null;
}

function asContentString(
	value: string | object | null | undefined,
	fallback: string,
) {
	if (typeof value === "string") return value;
	if (value != null) return JSON.stringify(value);
	return fallback;
}

function legacyBodyContent(template: MinuteTemplateRow) {
	return JSON.stringify(
		defaultMinuteBodyContent({
			showMeeting: template.showMeeting,
			showClasses: template.showClasses,
			showParticipants: template.showParticipants,
			showRecords: template.showRecords,
			showGeneralReports: template.showGeneralReports,
			showSignatures: template.showSignatures,
		}),
	);
}

function minuteHasEditableContent(minute: MinuteRow | undefined) {
	return (
		!!minute &&
		[minute.headerContent, minute.bodyContent, minute.footerContent].some(
			(value) => value != null,
		)
	);
}

function applyMinuteContent(
	preset: MinuteTemplateRow | null,
	minute: MinuteRow | undefined,
): MinuteTemplateRow | null {
	if (!preset && !minuteHasEditableContent(minute)) return null;

	const base: MinuteTemplateRow = preset ?? {
		id: minute?.templateId ?? "minute-local-content",
		name: "Ata da reunião",
		headerContent: JSON.stringify(emptyDoc()),
		bodyContent: JSON.stringify(defaultMinuteBodyContent()),
		footerContent: JSON.stringify(emptyDoc()),
		showMeeting: true,
		showClasses: true,
		showParticipants: true,
		showRecords: true,
		showGeneralReports: true,
		showSignatures: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	return {
		...base,
		headerContent: minute?.headerContent ?? base.headerContent,
		bodyContent:
			minute?.bodyContent ?? base.bodyContent ?? legacyBodyContent(base),
		footerContent: minute?.footerContent ?? base.footerContent,
	};
}

function buildMinuteEditableContent(
	preset: MinuteTemplateRow | null,
	minute: MinuteRow | undefined,
): MinuteEditableContentJson {
	const effective = applyMinuteContent(preset, minute);
	return {
		presetId: preset?.id ?? minute?.templateId ?? null,
		presetName: preset?.name ?? null,
		headerContent: asContentString(
			effective?.headerContent,
			JSON.stringify(emptyDoc()),
		),
		bodyContent: asContentString(
			effective?.bodyContent,
			JSON.stringify(defaultMinuteBodyContent()),
		),
		footerContent: asContentString(
			effective?.footerContent,
			JSON.stringify(emptyDoc()),
		),
	};
}

// ---------------------------------------------------------------------------
// Prévia e geração (spec 0009)
// ---------------------------------------------------------------------------

export async function findMinuteByMeetingId(db: DB, meetingId: string) {
	return db.query.minutes.findFirst({
		where: eq(minutes.meetingId, meetingId),
	});
}

export async function getMinuteEditableContent(
	db: DB,
	meetingId: string,
): Promise<MinuteEditableContentJson> {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	const preset = await resolveTemplate(db, meeting);
	const minute = await findMinuteByMeetingId(db, meetingId);
	return buildMinuteEditableContent(preset, minute);
}

export async function updateMinuteContent(
	db: DB,
	meetingId: string,
	input: UpdateMinuteContentInput,
): Promise<MinuteEditableContentJson> {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	if (meeting.status !== "open") {
		throw new MinuteNotEditableError(
			"Reunião encerrada: reabra para editar a ata",
		);
	}

	const preset = await resolveTemplate(db, meeting);
	const values = {
		headerContent: asContentString(
			input.headerContent,
			JSON.stringify(emptyDoc()),
		),
		bodyContent: asContentString(
			input.bodyContent,
			JSON.stringify(defaultMinuteBodyContent()),
		),
		footerContent: asContentString(
			input.footerContent,
			JSON.stringify(emptyDoc()),
		),
	};
	const minute = await findMinuteByMeetingId(db, meetingId);
	if (minute) {
		await db
			.update(minutes)
			.set({
				templateId: meeting.templateId ?? null,
				...values,
				approvalStatus: "pendente_aprovacao",
				approvedAt: null,
				approvalNotes: null,
			})
			.where(eq(minutes.id, minute.id))
			.returning()
			.get();
	} else {
		await db
			.insert(minutes)
			.values({
				id: crypto.randomUUID(),
				meetingId,
				templateId: meeting.templateId ?? null,
				...values,
			})
			.returning()
			.get();
	}

	return {
		presetId: preset?.id ?? meeting.templateId ?? null,
		presetName: preset?.name ?? null,
		...values,
	};
}

/** Prévia: permitida em qualquer status, inclusive `closed` (spec 0009). */
export async function previewMinute(db: DB, meetingId: string) {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	const minute = await findMinuteByMeetingId(db, meetingId);
	const template = await resolveTemplate(db, meeting);
	const data = await collectMinuteData(db, meetingId);
	const rendered = renderMinute({
		meeting,
		template: applyMinuteContent(template, minute),
		...data,
	});
	return {
		meetingId,
		templateId: template?.id ?? null,
		status: meeting.status,
		approvalStatus: minute?.approvalStatus ?? "pendente_aprovacao",
		approvedAt: minute?.approvedAt?.toISOString() ?? null,
		approvalNotes: minute?.approvalNotes ?? null,
		rendered,
		content: renderedToPlainText(rendered),
		editableContent: buildMinuteEditableContent(template, minute),
	};
}

/** Borda 3/4: versão oficial exige reunião aberta. */
function assertOpenMeeting(meeting: Meeting) {
	if (meeting.status !== "open") {
		throw new MeetingClosedError(ERR_MEETING_CLOSED);
	}
}

/**
 * Gera nova versão imutável com PDF (CA-008): versões anteriores e seus PDFs
 * permanecem; a nova vira a única atual (borda 5 da spec 0010) e o status de
 * aprovação volta a pendente (borda 2 da spec 0010).
 */
export async function generateMinuteVersion(
	db: DB,
	meetingId: string,
	input: { notes?: string | null } = {},
) {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	assertOpenMeeting(meeting);

	let minute = await findMinuteByMeetingId(db, meetingId);
	if (!minute) {
		minute = await db
			.insert(minutes)
			.values({
				id: crypto.randomUUID(),
				meetingId,
				templateId: meeting.templateId ?? null,
			})
			.returning()
			.get();
	} else if (
		minute.templateId !== (meeting.templateId ?? null) ||
		minute.approvalStatus === "aprovada"
	) {
		// Borda 2 (0010): regenerar após aprovação volta a pendente.
		minute = await db
			.update(minutes)
			.set({
				templateId: meeting.templateId ?? null,
				approvalStatus: "pendente_aprovacao",
				approvedAt: null,
				approvalNotes: null,
			})
			.where(eq(minutes.id, minute.id))
			.returning()
			.get();
	}

	const last = await db.query.minuteVersions.findMany({
		where: eq(minuteVersions.minuteId, minute.id),
		orderBy: (row, { desc }) => [desc(row.version)],
		limit: 1,
	});
	const nextVersion = (last[0]?.version ?? 0) + 1;

	const template = await resolveTemplate(db, meeting);
	const data = await collectMinuteData(db, meetingId);
	const rendered = renderMinute({
		meeting,
		template: applyMinuteContent(template, minute),
		...data,
	});
	const content = renderedToPlainText(rendered);
	const pdfBytes = await buildMinutePdf(rendered, {
		generatedAt: new Date().toISOString(),
	});

	// Única atual por ata (borda 5): desmarca anteriores antes de inserir.
	await db
		.update(minuteVersions)
		.set({ isCurrent: false })
		.where(
			and(
				eq(minuteVersions.minuteId, minute.id),
				eq(minuteVersions.isCurrent, true),
			),
		);

	const version = await db
		.insert(minuteVersions)
		.values({
			id: crypto.randomUUID(),
			minuteId: minute.id,
			version: nextVersion,
			content,
			pdf: pdfBytesToBuffer(pdfBytes),
			isCurrent: true,
			notes: input.notes ?? null,
		})
		.returning()
		.get();

	// ADR-0021: a geração da ata encerra a reunião (open → closed). O PDF já
	// foi construído a partir do conteúdo recém-gerado, então não há leitura
	// posterior dependente do status.
	const closedMeeting = await updateMeeting(db, meetingId, {
		status: "closed",
	});

	return { minute, version, pdfBytes, meeting: closedMeeting };
}

// ---------------------------------------------------------------------------
// Versões e PDF (spec 0010)
// ---------------------------------------------------------------------------

export async function listMinuteVersions(
	db: DB,
	meetingId: string,
): Promise<MinuteVersionJsonLite[]> {
	const minute = await findMinuteByMeetingId(db, meetingId);
	if (!minute) {
		throw new MinuteNotFoundError(ERR_MINUTE_NOT_FOUND);
	}
	const rows = await db.query.minuteVersions.findMany({
		where: eq(minuteVersions.minuteId, minute.id),
		orderBy: (row, { desc }) => [desc(row.version)],
	});
	return rows.map(serializeVersionRow);
}

type MinuteVersionJsonLite = ReturnType<typeof serializeVersionRow>;

export async function findMinuteVersionPdf(
	db: DB,
	meetingId: string,
	version: number,
): Promise<Buffer> {
	const minute = await findMinuteByMeetingId(db, meetingId);
	if (!minute) {
		throw new MinuteNotFoundError(ERR_MINUTE_NOT_FOUND);
	}
	const row = await db.query.minuteVersions.findFirst({
		where: and(
			eq(minuteVersions.minuteId, minute.id),
			eq(minuteVersions.version, version),
		),
	});
	if (!row) {
		throw new MinuteVersionNotFoundError(ERR_VERSION_NOT_FOUND);
	}
	const pdf = row.pdf;
	if (!Buffer.isBuffer(pdf) || pdf.length === 0) {
		throw new PdfNotAvailableError(ERR_PDF_NOT_AVAILABLE);
	}
	return pdf;
}

/** Borda 3/4: exige versão atual; data padrão é o momento da aprovação. */
export async function approveMinute(
	db: DB,
	meetingId: string,
	input: { data?: Date; observacao?: string | null } = {},
): Promise<MinuteRow> {
	const meeting = await findMeetingById(db, meetingId);
	if (!meeting) {
		throw new MeetingNotFoundError(ERR_MEETING_NOT_FOUND);
	}
	// Borda 6 (0010): aprovação exige reunião encerrada (ata gerada).
	if (meeting.status !== "closed") {
		throw new MeetingNotClosedError(ERR_MEETING_NOT_CLOSED);
	}
	const minute = await findMinuteByMeetingId(db, meetingId);
	if (!minute) {
		throw new MinuteNotFoundError(ERR_MINUTE_NOT_FOUND);
	}
	const current = await db.query.minuteVersions.findFirst({
		where: and(
			eq(minuteVersions.minuteId, minute.id),
			eq(minuteVersions.isCurrent, true),
		),
	});
	if (!current) {
		throw new NoCurrentVersionError(ERR_NO_CURRENT_VERSION);
	}
	if (minute.approvalStatus === "aprovada") {
		throw new MinuteAlreadyApprovedError(ERR_MINUTE_ALREADY_APPROVED);
	}
	return db
		.update(minutes)
		.set({
			approvalStatus: "aprovada",
			approvedAt: input.data ?? new Date(),
			approvalNotes: input.observacao ?? null,
		})
		.where(eq(minutes.id, minute.id))
		.returning()
		.get();
}
