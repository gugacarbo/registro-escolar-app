import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	isStudentEnrolledInClassAtDate,
	upsertStudentStatus,
} from "#/lib/meeting-student-status/repository";
import { findMeetingById } from "#/lib/meetings/repository";

import { updateStudentStatusHandler } from "./status";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/meetings/repository", () => ({
	findMeetingById: vi.fn(),
}));

vi.mock("#/lib/meeting-student-status/repository", () => ({
	isStudentEnrolledInClassAtDate: vi.fn(),
	upsertStudentStatus: vi.fn(),
}));

function createMockSession() {
	const now = new Date();
	return {
		session: {
			id: "session-1",
			createdAt: now,
			updatedAt: now,
			userId: "operator-1",
			expiresAt: new Date(now.getTime() + 3600_000),
			token: "token-1",
		},
		user: {
			id: "operator-1",
			name: "Operador",
			email: "op@example.com",
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
	};
}

function createEnv() {
	return {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "secret",
		BETTER_AUTH_URL: "http://localhost:3000",
	} as Env;
}

function patchRequest(body: unknown) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/students/student-1/status",
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

function mockInProgressMeeting() {
	(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "meeting-1",
		title: "Reunião 1",
		status: "open",
		heldAt: new Date("2025-06-10T12:00:00.000Z"),
		createdAt: new Date("2025-06-01T12:00:00.000Z"),
	});
}

describe("PATCH /api/meetings/:id/students/:studentId/status", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateStudentStatusHandler({
			request: patchRequest({ status: "concluido", classId: "class-1" }),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = patchRequest({ status: "concluido", classId: "class-1" });
		const response = await updateStudentStatusHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 400 com payload inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateStudentStatusHandler({
			request: patchRequest({}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 400 quando o status é inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateStudentStatusHandler({
			request: patchRequest({ status: "desconhecido", classId: "class-1" }),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando a reunião não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await updateStudentStatusHandler({
			request: patchRequest({ status: "concluido", classId: "class-1" }),
			context: { env: createEnv() },
			params: { meetingId: "missing", studentId: "student-1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando a reunião está encerrada", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião 1",
			status: "closed",
			heldAt: null,
			createdAt: new Date("2025-06-01T12:00:00.000Z"),
		});
		const response = await updateStudentStatusHandler({
			request: patchRequest({ status: "concluido", classId: "class-1" }),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 422 quando o estudante não está vinculado à turma na data", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		mockInProgressMeeting();
		(
			isStudentEnrolledInClassAtDate as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(false);
		const response = await updateStudentStatusHandler({
			request: patchRequest({ status: "concluido", classId: "class-1" }),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", studentId: "student-9" },
		});
		expect(response.status).toBe(422);
	});

	it("retorna 200 e atualiza o status", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		mockInProgressMeeting();
		(
			isStudentEnrolledInClassAtDate as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(true);
		(upsertStudentStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "status-1",
			meetingId: "meeting-1",
			classId: "class-1",
			studentId: "student-1",
			status: "concluido",
		});
		const response = await updateStudentStatusHandler({
			request: patchRequest({ status: "concluido", classId: "class-1" }),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { status: string };
		expect(body.status).toBe("concluido");
	});
});
