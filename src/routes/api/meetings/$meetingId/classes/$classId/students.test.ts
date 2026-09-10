import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	isClassLinkedToMeeting,
	listStudentsWithStatus,
} from "#/lib/meeting-student-status/repository";
import { findMeetingById } from "#/lib/meetings/repository";

import { listMeetingClassStudentsHandler } from "./students";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/meetings/repository", () => ({
	findMeetingById: vi.fn(),
}));

vi.mock("#/lib/meeting-student-status/repository", () => ({
	isClassLinkedToMeeting: vi.fn(),
	listStudentsWithStatus: vi.fn(),
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

describe("GET /api/meetings/:id/classes/:classId/students", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/classes/class-1/students",
			{ method: "GET" },
		);
		const response = await listMeetingClassStudentsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", classId: "class-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/classes/class-1/students",
			{ method: "GET" },
		);
		const response = await listMeetingClassStudentsHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1", classId: "class-1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 quando a reunião não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const request = new Request(
			"http://localhost/api/meetings/missing/classes/class-1/students",
			{ method: "GET" },
		);
		const response = await listMeetingClassStudentsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "missing", classId: "class-1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 404 quando a turma não está vinculada à reunião", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião 1",
		});
		(isClassLinkedToMeeting as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			false,
		);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/classes/class-3/students",
			{ method: "GET" },
		);
		const response = await listMeetingClassStudentsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", classId: "class-3" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Turma não vinculada a esta reunião");
	});

	it("retorna 200 com estudantes, contadores e próximo pendente", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião 1",
			heldAt: new Date("2025-06-10T12:00:00.000Z"),
		});
		(isClassLinkedToMeeting as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			true,
		);
		(listStudentsWithStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			students: [
				{
					studentId: "student-1",
					name: "Ana Souza",
					document: null,
					registrationNumber: "2025001",
					status: "pendente",
					statusUpdatedAt: null,
				},
			],
			counters: {
				total: 1,
				pendente: 1,
				em_discussao: 0,
				concluido: 0,
				nao_discutido: 0,
			},
			nextPendingStudentId: "student-1",
		});
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/classes/class-1/students",
			{ method: "GET" },
		);
		const response = await listMeetingClassStudentsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1", classId: "class-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			students: Array<{ studentId: string }>;
			counters: { total: number };
			nextPendingStudentId: string | null;
		};
		expect(body.students).toHaveLength(1);
		expect(body.counters.total).toBe(1);
		expect(body.nextPendingStudentId).toBe("student-1");
	});
});
