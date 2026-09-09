import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findMeetingById, updateMeeting } from "#/lib/meetings/repository";

import { getMeetingHandler, updateMeetingHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/meetings/repository", () => ({
	findMeetingById: vi.fn(),
	updateMeeting: vi.fn(),
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

beforeEach(() => {
	vi.clearAllMocks();
	(findMeetingById as ReturnType<typeof vi.fn>).mockReset();
	(updateMeeting as ReturnType<typeof vi.fn>).mockReset();
	(getSession as ReturnType<typeof vi.fn>).mockReset();
});

describe("GET /api/meetings/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await getMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/meetings/meeting-1/", {
			method: "GET",
		});
		const response = await getMeetingHandler({
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
		const response = await getMeetingHandler({
			request: new Request("http://localhost/api/meetings/missing/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Reunião não encontrada");
	});

	it("retorna 200 com a reunião", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião 1",
			status: "draft",
		});
		const response = await getMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { id: string };
		expect(body.id).toBe("meeting-1");
	});
});

describe("PATCH /api/meetings/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "PATCH",
				body: JSON.stringify({ title: "Novo título" }),
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "draft",
		});
		const response = await updateMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "PATCH",
				body: JSON.stringify({ title: 12 }),
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 no PATCH quando a reunião não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await updateMeetingHandler({
			request: new Request("http://localhost/api/meetings/missing/", {
				method: "PATCH",
				body: JSON.stringify({ title: "Novo" }),
			}),
			context: { env: createEnv() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando a reunião está em andamento", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "in_progress",
		});
		const response = await updateMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "PATCH",
				body: JSON.stringify({ title: "Novo título" }),
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(409);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe(
			"Reunião em andamento/finalizada não pode ser editada",
		);
	});

	it("retorna 409 quando a reunião está finalizada", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "finished",
		});
		const response = await updateMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "PATCH",
				body: JSON.stringify({ title: "Novo título" }),
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 200 e atualiza a reunião em rascunho", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "draft",
		});
		(updateMeeting as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Novo título",
			status: "draft",
		});
		const response = await updateMeetingHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/", {
				method: "PATCH",
				body: JSON.stringify({ title: "Novo título" }),
			}),
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { title: string };
		expect(body.title).toBe("Novo título");
	});

	it("resolve env via fallback no PATCH e atualiza campos opcionais", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "draft",
		});
		(updateMeeting as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião",
			heldAt: new Date(Date.UTC(2026, 8, 9)),
			templateId: null,
			status: "draft",
		});
		const request = new Request("http://localhost/api/meetings/meeting-1/", {
			method: "PATCH",
			body: JSON.stringify({
				title: "Reunião",
				heldAt: "2026-09-09",
				templateId: null,
			}),
		});
		const response = await updateMeetingHandler({
			request,
			context: { env: createEnv() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(200);
		expect(sessionMock).toHaveBeenCalledWith(request, expect.anything());
		expect(updateMeeting).toHaveBeenCalledWith(
			expect.anything(),
			"meeting-1",
			expect.objectContaining({
				title: "Reunião",
				heldAt: new Date("2026-09-09T00:00:00.000Z"),
				templateId: null,
			}),
		);
	});
});
