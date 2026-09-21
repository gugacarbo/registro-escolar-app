import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findRoleById, updateRole } from "#/lib/roles/repository";

import { getRoleHandler, updateRoleHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/roles/repository", () => ({
	findRoleById: vi.fn(),
	updateRole: vi.fn(),
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
	(findRoleById as ReturnType<typeof vi.fn>).mockReset();
	(updateRole as ReturnType<typeof vi.fn>).mockReset();
	(getSession as ReturnType<typeof vi.fn>).mockReset();
});

describe("GET /api/roles/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await getRoleHandler({
			request: new Request("http://localhost/api/roles/role-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "role-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/roles/role-1/", {
			method: "GET",
		});
		const response = await getRoleHandler({
			request,
			context: {},
			params: { id: "role-1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 quando o cargo não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
		const response = await getRoleHandler({
			request: new Request("http://localhost/api/roles/missing/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Cargo não encontrado");
	});

	it("retorna 200 com o cargo", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "role-1",
			name: "Professor",
		});
		const response = await getRoleHandler({
			request: new Request("http://localhost/api/roles/role-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "role-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { id: string };
		expect(body.id).toBe("role-1");
	});
});

describe("PATCH /api/roles/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateRoleHandler({
			request: new Request("http://localhost/api/roles/role-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Direção" }),
			}),
			context: { env: createEnv() },
			params: { id: "role-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateRoleHandler({
			request: new Request("http://localhost/api/roles/role-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: 42 }),
			}),
			context: { env: createEnv() },
			params: { id: "role-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 no PATCH quando o cargo não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
		const response = await updateRoleHandler({
			request: new Request("http://localhost/api/roles/missing/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Direção" }),
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 e atualiza o cargo", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "role-1",
			name: "Professor",
		});
		(updateRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "role-1",
			name: "Direção",
		});
		const response = await updateRoleHandler({
			request: new Request("http://localhost/api/roles/role-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Direção" }),
			}),
			context: { env: createEnv() },
			params: { id: "role-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("Direção");
		expect(updateRole).toHaveBeenCalledWith(
			expect.anything(),
			"role-1",
			expect.objectContaining({ name: "Direção" }),
		);
	});

	it("retorna 400 quando o corpo não é JSON", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findRoleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "cargo-1",
			name: "Registro",
		} as never);
		const response = await updateRoleHandler({
			request: new Request("http://localhost/api/roles/cargo-1", {
				method: "PATCH",
				body: "not-json",
			}),
			context: { env: createEnv() },
			params: { id: "cargo-1" },
		});
		expect(response.status).toBe(400);
	});
});
