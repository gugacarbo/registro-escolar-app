import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	createStaff,
	findStaffByName,
	listStaff,
} from "#/lib/staff/repository";

import { createStaffHandler, listStaffHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/staff/repository", () => ({
	createStaff: vi.fn(),
	findStaffByName: vi.fn().mockResolvedValue([]),
	listStaff: vi.fn().mockResolvedValue([]),
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

describe("GET /api/staff", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/staff", {
			method: "GET",
		});
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/staff", {
			method: "GET",
		});
		const response = await listStaffHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 200 com a lista de servidores", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStaff as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([{ id: "staff-1", name: "João Silva" }]);
		const request = new Request("http://localhost/api/staff?search=João", {
			method: "GET",
		});
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{ name: string }>;
		expect(body).toHaveLength(1);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: "João" }),
		);
	});

	it("lista sem busca e aplica padrões com parâmetros inválidos", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStaff as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const request = new Request("http://localhost/api/staff?limit=0&offset=x", {
			method: "GET",
		});
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 50, offset: 0, search: undefined }),
		);
	});

	it("restringe o limite ao máximo permitido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStaff as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const request = new Request(
			"http://localhost/api/staff?limit=999&offset=5",
			{ method: "GET" },
		);
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 200, offset: 5 }),
		);
	});
});

describe("POST /api/staff", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/staff", {
			method: "POST",
			body: JSON.stringify({ name: "João" }),
		});
		const response = await createStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/staff", {
			method: "POST",
			body: JSON.stringify({ name: "João" }),
		});
		const response = await createStaffHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 400 quando o nome é vazio", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const request = new Request("http://localhost/api/staff", {
			method: "POST",
			body: JSON.stringify({ name: "" }),
		});
		const response = await createStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 201 e cria o servidor", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createStaff as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "uuid-1",
			name: "João Silva",
			email: null,
			phone: null,
			notes: null,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const request = new Request("http://localhost/api/staff", {
			method: "POST",
			body: JSON.stringify({ name: "João Silva" }),
		});
		const response = await createStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("João Silva");
	});

	it("retorna 409 quando o servidor já existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findStaffByName as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce([
			{
				id: "existing-1",
				name: "João Silva",
				email: null,
				phone: null,
				notes: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const request = new Request("http://localhost/api/staff", {
			method: "POST",
			body: JSON.stringify({ name: "João Silva" }),
		});
		const response = await createStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(409);
	});
});
