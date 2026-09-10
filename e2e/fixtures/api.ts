import { signInTestUser, signUpTestUser, type TestUser } from "./auth";

export const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

export type ApiContext = {
	cookies: string;
	user: TestUser;
};

export async function createAuthenticatedContext(): Promise<ApiContext> {
	const { user } = await signUpTestUser();
	const response = await signInTestUser(user);

	if (!response.ok) {
		throw new Error(`Failed to sign in via API: ${response.status}`);
	}

	const cookies = response.headers.get("set-cookie") ?? "";
	if (!cookies) {
		throw new Error("No set-cookie header returned from sign-in");
	}

	return { cookies, user };
}

function api(method: string, path: string, cookies: string, body?: unknown) {
	const headers: Record<string, string> = { Cookie: cookies };
	const init: RequestInit = { method, headers };
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
		init.body = JSON.stringify(body);
	}
	return fetch(`${baseURL}${path}`, init);
}

export async function createStudent(
	ctx: ApiContext,
	name: string,
	extra?: object,
): Promise<{ id: string; name: string }> {
	const res = await api("POST", "/api/students", ctx.cookies, { name, ...extra });
	if (!res.ok) throw new Error(`createStudent failed: ${res.status}`);
	return res.json();
}

export async function createClass(
	ctx: ApiContext,
	nome: string,
	periodoLetivo: string,
	extra?: { curso?: string; serie?: string; turno?: string },
): Promise<{ id: string; name: string }> {
	const input = { nome, periodoLetivo, ...extra };
	const res = await api("POST", "/api/classes", ctx.cookies, input);
	if (!res.ok) throw new Error(`createClass failed: ${res.status}`);
	return res.json();
}

export async function createEnrollment(
	ctx: ApiContext,
	input: {
		estudanteId: string;
		turmaId: string;
		dataInicio: string;
		dataTermino?: string;
		status?: string;
	},
): Promise<{ enrollment: { id: string }; closedEnrollments: Array<{ id: string }> }> {
	const res = await api("POST", "/api/enrollments", ctx.cookies, input);
	if (!res.ok) throw new Error(`createEnrollment failed: ${res.status}`);
	return res.json();
}

export async function createStaff(
	ctx: ApiContext,
	name: string,
): Promise<{ id: string; name: string }> {
	const res = await api("POST", "/api/staff", ctx.cookies, { name });
	if (!res.ok) throw new Error(`createStaff failed: ${res.status}`);
	return res.json();
}

export async function createRole(
	ctx: ApiContext,
	name: string,
): Promise<{ id: string; name: string }> {
	const res = await api("POST", "/api/roles", ctx.cookies, { name });
	if (!res.ok) throw new Error(`createRole failed: ${res.status}`);
	return res.json();
}

export async function createRoleResponse(ctx: ApiContext, name: string) {
	return api("POST", "/api/roles", ctx.cookies, { name });
}

export async function listRoles(ctx: ApiContext) {
	const res = await api("GET", "/api/roles", ctx.cookies);
	if (!res.ok) throw new Error(`listRoles failed: ${res.status}`);
	const body = (await res.json()) as {
		data: Array<{ id: string; name: string }>;
	};
	return body.data;
}

export async function softDeleteStaff(ctx: ApiContext, staffId: string) {
	const res = await api("DELETE", `/api/staff/${staffId}`, ctx.cookies);
	if (!res.ok) throw new Error(`softDeleteStaff failed: ${res.status}`);
	return res.json() as Promise<{ id: string; deletedAt: string | null }>;
}

export async function createComponent(
	ctx: ApiContext,
	name: string,
): Promise<{ id: string; name: string }> {
	const res = await api("POST", "/api/components", ctx.cookies, { name });
	if (!res.ok) throw new Error(`createComponent failed: ${res.status}`);
	return res.json();
}

export async function createComponentResponse(ctx: ApiContext, name: string) {
	return api("POST", "/api/components", ctx.cookies, { name });
}

export async function createOffer(
	ctx: ApiContext,
	classId: string,
	componentId: string,
	professorIds: string[] = [],
): Promise<{ id: string; componentId: string }> {
	const res = await api("POST", `/api/classes/${classId}/offers`, ctx.cookies, {
		componentId,
		professorIds,
	});
	if (!res.ok) throw new Error(`createOffer failed: ${res.status}`);
	return res.json();
}

export async function createOfferResponse(
	ctx: ApiContext,
	classId: string,
	componentId: string,
	professorIds: string[] = [],
) {
	return api("POST", `/api/classes/${classId}/offers`, ctx.cookies, {
		componentId,
		professorIds,
	});
}

export async function createMeeting(
	ctx: ApiContext,
	input: {
		title: string;
		heldAt?: string;
		templateId?: string | null;
		classIds?: string[];
		participants?: Array<{ staffId: string; roleId: string }>;
	},
): Promise<{ id: string; title: string; status: string }> {
	const res = await api("POST", "/api/meetings", ctx.cookies, input);
	if (!res.ok) throw new Error(`createMeeting failed: ${res.status}`);
	return res.json();
}

export async function addParticipant(
	ctx: ApiContext,
	meetingId: string,
	staffId: string,
	roleId: string,
): Promise<{ id: string; staffId: string; roleId: string }> {
	const res = await api("POST", `/api/meetings/${meetingId}/participants`, ctx.cookies, {
		staffId,
		roleId,
	});
	if (!res.ok) throw new Error(`addParticipant failed: ${res.status}`);
	return res.json();
}

export async function createIndependentRecord(
	ctx: ApiContext,
	studentId: string,
	texto: string,
	extra?: object,
): Promise<{ id: string; texto: string }> {
	const res = await api("POST", `/api/students/${studentId}/records`, ctx.cookies, {
		texto,
		...extra,
	});
	if (!res.ok) throw new Error(`createIndependentRecord failed: ${res.status}`);
	return res.json();
}

export async function createLinkedRecord(
	ctx: ApiContext,
	meetingId: string,
	studentId: string,
	texto: string,
	extra?: object,
): Promise<{ id: string; texto: string; includeInMinutes: boolean }> {
	const res = await api("POST", `/api/meetings/${meetingId}/students/${studentId}/records`, ctx.cookies, {
		texto,
		...extra,
	});
	if (!res.ok) throw new Error(`createLinkedRecord failed: ${res.status}`);
	return res.json();
}

export async function createGeneralReport(
	ctx: ApiContext,
	meetingId: string,
	texto: string,
	extra?: { incluirNaAta?: boolean; categoriaId?: string | null; origemId?: string | null },
): Promise<{ id: string; texto: string; includeInMinutes: boolean }> {
	const res = await api("POST", `/api/meetings/${meetingId}/general-reports`, ctx.cookies, {
		texto,
		...extra,
	});
	if (!res.ok) throw new Error(`createGeneralReport failed: ${res.status}`);
	return res.json();
}

export async function createMinuteTemplate(
	ctx: ApiContext,
	input: {
		name: string;
		headerText?: string;
		footerText?: string;
		showMeeting?: boolean;
		showClasses?: boolean;
		showParticipants?: boolean;
		showRecords?: boolean;
		showGeneralReports?: boolean;
		showSignatures?: boolean;
	},
): Promise<{ id: string; name: string }> {
	const res = await api("POST", "/api/minute-templates", ctx.cookies, input);
	if (!res.ok) throw new Error(`createMinuteTemplate failed: ${res.status}`);
	return res.json();
}

export async function startMeeting(
	ctx: ApiContext,
	meetingId: string,
): Promise<{ id: string; status: string }> {
	const res = await api("PATCH", `/api/meetings/${meetingId}/start`, ctx.cookies);
	if (!res.ok) throw new Error(`startMeeting failed: ${res.status}`);
	return res.json();
}

export async function transitionMeetingResponse(
	ctx: ApiContext,
	meetingId: string,
	action: "start" | "finalize" | "reopen",
) {
	return api("PATCH", `/api/meetings/${meetingId}/${action}`, ctx.cookies);
}

export async function finalizeMeeting(ctx: ApiContext, meetingId: string) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/finalize`, ctx.cookies);
	if (!res.ok) throw new Error(`finalizeMeeting failed: ${res.status}`);
	return res.json();
}

export async function reopenMeeting(ctx: ApiContext, meetingId: string) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/reopen`, ctx.cookies);
	if (!res.ok) throw new Error(`reopenMeeting failed: ${res.status}`);
	return res.json();
}

export async function generateMinute(
	ctx: ApiContext,
	meetingId: string,
	observacao?: string,
): Promise<{
	minuteId: string;
	version: number;
	isCurrent: boolean;
	approvalStatus: string;
	pdfSize: number;
}> {
	const res = await api("POST", `/api/meetings/${meetingId}/minutes`, ctx.cookies, { observacao });
	if (!res.ok) throw new Error(`generateMinute failed: ${res.status}`);
	return res.json();
}

export async function updateMeetingTemplate(
	ctx: ApiContext,
	meetingId: string,
	templateId: string,
): Promise<{ id: string; templateId: string | null }> {
	const res = await api("PATCH", `/api/meetings/${meetingId}`, ctx.cookies, {
		templateId,
	});
	if (!res.ok) throw new Error(`updateMeetingTemplate failed: ${res.status}`);
	return res.json();
}

export async function previewMinute(
	ctx: ApiContext,
	meetingId: string,
): Promise<{
	meetingId: string;
	templateId: string | null;
	status: string;
	approvalStatus: string;
	rendered: { title: string; lines: Array<{ text: string; level: number }> };
	content: string;
}> {
	const res = await api("GET", `/api/meetings/${meetingId}/minutes`, ctx.cookies);
	if (!res.ok) throw new Error(`previewMinute failed: ${res.status}`);
	return res.json();
}

export async function approveMinute(
	ctx: ApiContext,
	meetingId: string,
	data?: string,
	observacao?: string,
): Promise<{
	id: string;
	meetingId: string;
	approvalStatus: string;
	approvedAt: string | null;
	approvalNotes: string | null;
}> {
	const res = await api("PATCH", `/api/meetings/${meetingId}/minutes/approve`, ctx.cookies, { data, observacao });
	if (!res.ok) throw new Error(`approveMinute failed: ${res.status}`);
	return res.json();
}

export async function listMinuteVersions(
	ctx: ApiContext,
	meetingId: string,
): Promise<
	Array<{
		id: string;
		minuteId: string;
		version: number;
		isCurrent: boolean;
		notes: string | null;
		createdAt: string;
		hasPdf: boolean;
	}>
> {
	const res = await api("GET", `/api/meetings/${meetingId}/minutes/versions`, ctx.cookies);
	if (!res.ok) throw new Error(`listMinuteVersions failed: ${res.status}`);
	return res.json();
}

export async function updateStudentStatus(
	ctx: ApiContext,
	meetingId: string,
	studentId: string,
	status: "pendente" | "em_discussao" | "concluido" | "nao_discutido",
	classId: string,
): Promise<{ id: string; status: string }> {
	const res = await api("PATCH", `/api/meetings/${meetingId}/students/${studentId}/status`, ctx.cookies, { status, classId });
	if (!res.ok) throw new Error(`updateStudentStatus failed: ${res.status}`);
	return res.json();
}

export async function setRecordInclusion(ctx: ApiContext, meetingId: string, studentId: string, recordId: string, incluir: boolean) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/students/${studentId}/records/${recordId}/include`, ctx.cookies, { incluir });
	if (!res.ok) throw new Error(`setRecordInclusion failed: ${res.status}`);
	return res.json();
}
