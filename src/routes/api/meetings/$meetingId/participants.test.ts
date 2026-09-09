import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	createParticipant,
	findMeetingById,
	findParticipant,
	listParticipantsByMeeting,
} from "#/lib/meetings/repository";
import { findRoleById } from "#/lib/roles/repository";
import { findActiveStaffById } from "#/lib/staff/repository";

import {
	createParticipantHandler,
	listParticipantsHandler,
} from "./participants";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/meetings/repository", () => ({
	createParticipant: vi.fn(),
	findMeetingById: vi.fn(),
	findParticipant: vi.fn().mockResolvedValue(undefined),
	listParticipantsByMeeting: vi.fn().mockResolvedValue([]),
}));

vi.mock("#/lib/staff/repository", () => ({
	findActiveStaffById: vi.fn(),
}));

vi.mock("#/lib/roles/repository", () => ({
	findRoleById: vi.fn(),
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

function mockValidRefs() {
	(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "meeting-1",
		title: "Reunião 1",
	});
	(findActiveStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "staff-1",
		name: "João Silva",
	});
	(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "role-1",
		name: "Professor",
	});
}

describe("GET /api/meetings/:id/participants", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{ method: "GET" },
		);
		const response = await listParticipantsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{ method: "GET" },
		);
		const response = await listParticipantsHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1" },
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
			"http://localhost/api/meetings/missing/participants",
			{ method: "GET" },
		);
		const response = await listParticipantsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 com os participantes da reunião", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião 1",
		});
		(
			listParticipantsByMeeting as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce([{ id: "participant-1" }]);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{ method: "GET" },
		);
		const response = await listParticipantsHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{ id: string }>;
		expect(body).toHaveLength(1);
	});
});

describe("POST /api/meetings/:id/participants", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "staff-1", roleId: "role-1" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "staff-1", roleId: "role-1" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 400 com payload inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{ method: "POST", body: JSON.stringify({}) },
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 400 quando staffId ou roleId estão vazios", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "", roleId: "" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando a reunião não existe no POST", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const request = new Request(
			"http://localhost/api/meetings/missing/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "staff-1", roleId: "role-1" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 404 quando o papel não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
		});
		(findActiveStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "staff-1",
		});
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "staff-1", roleId: "missing" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 404 quando o servidor não existe ou foi removido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
		});
		(findActiveStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "missing", roleId: "role-1" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando o participante já foi adicionado", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		mockValidRefs();
		(findParticipant as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "participant-1",
		});
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "staff-1", roleId: "role-1" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 201 e cria o participante", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		mockValidRefs();
		(createParticipant as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "participant-1",
			meetingId: "meeting-1",
			staffId: "staff-1",
			roleId: "role-1",
		});
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/participants",
			{
				method: "POST",
				body: JSON.stringify({ staffId: "staff-1", roleId: "role-1" }),
			},
		);
		const response = await createParticipantHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(201);
		expect(listParticipantsByMeeting).toBeDefined();
	});
});
