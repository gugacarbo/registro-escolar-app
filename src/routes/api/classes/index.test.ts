import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { createClass, listClasses } from "#/lib/classes/repository";

import { createClassHandler, listClassesHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/classes/repository", () => ({
	createClass: vi.fn(),
	listClasses: vi.fn().mockResolvedValue([]),
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

describe("GET /api/classes", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes", {
			method: "GET",
		});
		const response = await listClassesHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 200 com a lista de turmas", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listClasses as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([
			{ id: "t1", name: "7º A", academicPeriod: "2026" },
		]);
		const request = new Request("http://localhost/api/classes", {
			method: "GET",
		});
		const response = await listClassesHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveLength(1);
	});
});

describe("POST /api/classes", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "7º A", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 201 com a turma criada", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createClass as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "t1",
			name: "7º A",
			academicPeriod: "2026",
		});
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "7º A", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
	});
});
