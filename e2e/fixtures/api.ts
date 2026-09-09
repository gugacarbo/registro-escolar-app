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
	input: object,
): Promise<{ enrollment: unknown; closedEnrollments: unknown[] }> {
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

export async function createRole(ctx: ApiContext, name: string) {
	const res = await api("POST", "/api/roles", ctx.cookies, { name });
	if (!res.ok) throw new Error(`createRole failed: ${res.status}`);
	return res.json();
}

export async function createComponent(ctx: ApiContext, name: string) {
	const res = await api("POST", "/api/components", ctx.cookies, { name });
	if (!res.ok) throw new Error(`createComponent failed: ${res.status}`);
	return res.json();
}

export async function createOffer(ctx: ApiContext, classId: string, componentId: string, professorIds: string[] = []) {
	const res = await api("POST", `/api/classes/${classId}/offers`, ctx.cookies, {
		componentId,
		professorIds,
	});
	if (!res.ok) throw new Error(`createOffer failed: ${res.status}`);
	return res.json();
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

export async function createIndependentRecord(ctx: ApiContext, studentId: string, texto: string, extra?: object) {
	const res = await api("POST", `/api/students/${studentId}/records`, ctx.cookies, {
		texto,
		...extra,
	});
	if (!res.ok) throw new Error(`createIndependentRecord failed: ${res.status}`);
	return res.json();
}

export async function createLinkedRecord(ctx: ApiContext, meetingId: string, studentId: string, texto: string, extra?: object) {
	const res = await api("POST", `/api/meetings/${meetingId}/students/${studentId}/records`, ctx.cookies, {
		texto,
		...extra,
	});
	if (!res.ok) throw new Error(`createLinkedRecord failed: ${res.status}`);
	return res.json();
}

export async function createGeneralReport(ctx: ApiContext, meetingId: string, texto: string, extra?: object) {
	const res = await api("POST", `/api/meetings/${meetingId}/general-reports`, ctx.cookies, {
		texto,
		...extra,
	});
	if (!res.ok) throw new Error(`createGeneralReport failed: ${res.status}`);
	return res.json();
}

export async function createMinuteTemplate(ctx: ApiContext, input: object) {
	const res = await api("POST", "/api/minute-templates", ctx.cookies, input);
	if (!res.ok) throw new Error(`createMinuteTemplate failed: ${res.status}`);
	return res.json();
}

export async function startMeeting(ctx: ApiContext, meetingId: string) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/start`, ctx.cookies);
	if (!res.ok) throw new Error(`startMeeting failed: ${res.status}`);
	return res.json();
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

export async function generateMinute(ctx: ApiContext, meetingId: string, observacao?: string) {
	const res = await api("POST", `/api/meetings/${meetingId}/minutes/generate`, ctx.cookies, { observacao });
	if (!res.ok) throw new Error(`generateMinute failed: ${res.status}`);
	return res.json();
}

export async function approveMinute(ctx: ApiContext, meetingId: string, data?: string, observacao?: string) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/minutes/approve`, ctx.cookies, { data, observacao });
	if (!res.ok) throw new Error(`approveMinute failed: ${res.status}`);
	return res.json();
}

export async function updateStudentStatus(ctx: ApiContext, meetingId: string, studentId: string, status: string, classId: string) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/students/${studentId}/status`, ctx.cookies, { status, classId });
	if (!res.ok) throw new Error(`updateStudentStatus failed: ${res.status}`);
	return res.json();
}

export async function setRecordInclusion(ctx: ApiContext, meetingId: string, studentId: string, recordId: string, incluir: boolean) {
	const res = await api("PATCH", `/api/meetings/${meetingId}/students/${studentId}/records/${recordId}/include`, ctx.cookies, { incluir });
	if (!res.ok) throw new Error(`setRecordInclusion failed: ${res.status}`);
	return res.json();
}
