import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import {
	createMeetingWithRelations,
	listMeetings,
} from "#/lib/meetings/repository";
import { findRoleById } from "#/lib/roles/repository";
import { findActiveStaffById } from "#/lib/staff/repository";

import { createMeetingHandler, listMeetingsHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/meetings/repository", () => ({
	listMeetings: vi.fn().mockResolvedValue([]),
	createMeetingWithRelations: vi.fn(),
}));

vi.mock("#/lib/classes/repository", () => ({
	findClassById: vi.fn(),
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
	(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "class-1",
		name: "Turma 1",
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

describe("GET /api/meetings/", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await listMeetingsHandler({
			request: new Request("http://localhost/api/meetings/", { method: "GET" }),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/meetings/", {
			method: "GET",
		});
		const response = await listMeetingsHandler({
			request,
			context: {},
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 200 com a lista de reuniões", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(listMeetings as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ id: "meeting-1", title: "Reunião 1", status: "draft" },
		]);
		const response = await listMeetingsHandler({
			request: new Request("http://localhost/api/meetings/", { method: "GET" }),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{ id: string }>;
		expect(body).toHaveLength(1);
	});

	it("repasse o filtro de status para o repository", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(listMeetings as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
		const response = await listMeetingsHandler({
			request: new Request("http://localhost/api/meetings/?status=draft", {
				method: "GET",
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMeetings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ status: "draft" }),
		);
	});

	it("normaliza paginação inválida", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listMeetings as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
		const response = await listMeetingsHandler({
			request: new Request(
				"http://localhost/api/meetings/?limit=999&offset=-2",
				{ method: "GET" },
			),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMeetings).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 200, offset: 0, status: undefined }),
		);
	});

	it("ignore status inválido sem quebrar a listagem", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(listMeetings as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
		const response = await listMeetingsHandler({
			request: new Request("http://localhost/api/meetings/?status=foo", {
				method: "GET",
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMeetings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ status: undefined }),
		);
	});
});

describe("POST /api/meetings/", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({ title: "Reunião 1" }),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({}),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando uma turma não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({ title: "Reunião 1", classIds: ["missing"] }),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Turma não encontrada");
	});

	it("retorna 404 quando um servidor participante não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findActiveStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({
					title: "Reunião 1",
					participants: [{ staffId: "missing", roleId: "role-1" }],
				}),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Servidor não encontrado");
	});

	it("retorna 404 quando um papel não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findActiveStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "staff-1",
		});
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({
					title: "Reunião 1",
					participants: [{ staffId: "staff-1", roleId: "missing" }],
				}),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Papel não encontrado");
	});

	it("retorna 201 e cria a reunião sempre como draft", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		mockValidRefs();
		(
			createMeetingWithRelations as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			id: "meeting-1",
			title: "Reunião 1",
			status: "draft",
		});
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({
					title: "Reunião 1",
					templateId: "template-1",
					classIds: ["class-1"],
					participants: [{ staffId: "staff-1", roleId: "role-1" }],
				}),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as { status: string };
		expect(body.status).toBe("draft");
		expect(createMeetingWithRelations).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				title: "Reunião 1",
				templateId: "template-1",
				classIds: ["class-1"],
				participants: [{ staffId: "staff-1", roleId: "role-1" }],
			}),
		);
	});

	it("cria reunião sem template convertendo para null", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		mockValidRefs();
		(
			createMeetingWithRelations as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			id: "meeting-2",
			status: "draft",
		});
		const response = await createMeetingHandler({
			request: new Request("http://localhost/api/meetings/", {
				method: "POST",
				body: JSON.stringify({
					title: "Reunião sem template",
					classIds: ["class-1"],
					participants: [{ staffId: "staff-1", roleId: "role-1" }],
				}),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
		expect(createMeetingWithRelations).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ templateId: null }),
		);
	});
});
