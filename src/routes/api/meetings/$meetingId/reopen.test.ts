import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { InvalidTransitionError } from "#/lib/meetings/errors";
import { findMeetingById, transitionMeeting } from "#/lib/meetings/repository";

import { reopenMeetingHandler } from "./reopen";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/meetings/repository", () => ({
	findMeetingById: vi.fn(),
	transitionMeeting: vi.fn(),
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

describe("PATCH /api/meetings/:id/reopen", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await reopenMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/reopen", {
				method: "PATCH",
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/reopen",
			{ method: "PATCH" },
		);
		const response = await reopenMeetingHandler({
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
		const response = await reopenMeetingHandler({
			request: new Request("http://localhost/api/meetings/missing/reopen", {
				method: "PATCH",
			}),
			context: { env: createEnv() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Reunião não encontrada");
	});

	it("retorna 409 quando a reunião está aberta", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "open",
		});
		(transitionMeeting as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new InvalidTransitionError(),
		);
		const response = await reopenMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/reopen", {
				method: "PATCH",
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 200 ao reabrir a reunião", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "closed",
		});
		(transitionMeeting as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "open",
		});
		const response = await reopenMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/reopen", {
				method: "PATCH",
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { status: string };
		expect(body.status).toBe("open");
	});
});
