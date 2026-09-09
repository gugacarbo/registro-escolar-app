import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	createRole,
	ensureDefaultRoles,
	findRoleByNormalizedName,
	listRoles,
} from "#/lib/roles/repository";

import { createRoleHandler, listRolesHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/roles/repository", () => ({
	createRole: vi.fn(),
	ensureDefaultRoles: vi.fn().mockResolvedValue(undefined),
	findRoleByNormalizedName: vi.fn().mockResolvedValue(undefined),
	listRoles: vi.fn().mockResolvedValue([]),
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

describe("GET /api/roles", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/roles", {
			method: "GET",
		});
		const response = await listRolesHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 200 com a lista de papéis após garantir o padrão", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listRoles as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([{ id: "role-1", name: "Professor" }]);
		const request = new Request("http://localhost/api/roles", {
			method: "GET",
		});
		const response = await listRolesHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(ensureDefaultRoles).toHaveBeenCalled();
		const body = (await response.json()) as Array<{ name: string }>;
		expect(body).toHaveLength(1);
	});
});

describe("POST /api/roles", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/roles", {
			method: "POST",
			body: JSON.stringify({ name: "Direção" }),
		});
		const response = await createRoleHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 quando o nome é vazio", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const request = new Request("http://localhost/api/roles", {
			method: "POST",
			body: JSON.stringify({ name: "" }),
		});
		const response = await createRoleHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 201 e cria o papel", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createRole as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "uuid-1",
			name: "Direção",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const request = new Request("http://localhost/api/roles", {
			method: "POST",
			body: JSON.stringify({ name: "Direção" }),
		});
		const response = await createRoleHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
	});

	it("retorna 409 quando o papel já existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findRoleByNormalizedName as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce({ id: "existing-1", name: "Professor" });
		const request = new Request("http://localhost/api/roles", {
			method: "POST",
			body: JSON.stringify({ name: "professor" }),
		});
		const response = await createRoleHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(409);
	});
});
