import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findComponentById, updateComponent } from "#/lib/components/repository";

import { getComponentHandler, updateComponentHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/components/repository", () => ({
	findComponentById: vi.fn(),
	updateComponent: vi.fn(),
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
	(findComponentById as ReturnType<typeof vi.fn>).mockReset();
	(updateComponent as ReturnType<typeof vi.fn>).mockReset();
	(getSession as ReturnType<typeof vi.fn>).mockReset();
});

describe("GET /api/components/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await getComponentHandler({
			request: new Request("http://localhost/api/components/c1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "c1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/components/c1/", {
			method: "GET",
		});
		const response = await getComponentHandler({
			request,
			context: {},
			params: { id: "c1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 quando o componente não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(
			findComponentById as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(undefined);
		const response = await getComponentHandler({
			request: new Request("http://localhost/api/components/missing/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Componente não encontrado");
	});

	it("retorna 200 com o componente", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
			name: "Matemática",
		});
		const response = await getComponentHandler({
			request: new Request("http://localhost/api/components/c1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "c1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { id: string };
		expect(body.id).toBe("c1");
	});
});

describe("PATCH /api/components/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateComponentHandler({
			request: new Request("http://localhost/api/components/c1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Física" }),
			}),
			context: { env: createEnv() },
			params: { id: "c1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateComponentHandler({
			request: new Request("http://localhost/api/components/c1/", {
				method: "PATCH",
				body: JSON.stringify({ name: 42 }),
			}),
			context: { env: createEnv() },
			params: { id: "c1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 no PATCH quando o componente não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(
			findComponentById as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(undefined);
		const response = await updateComponentHandler({
			request: new Request("http://localhost/api/components/missing/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Física" }),
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 e atualiza o componente", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
			name: "Matemática",
		});
		(updateComponent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
			name: "Matemática Aplicada",
		});
		const response = await updateComponentHandler({
			request: new Request("http://localhost/api/components/c1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Matemática Aplicada" }),
			}),
			context: { env: createEnv() },
			params: { id: "c1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("Matemática Aplicada");
		expect(updateComponent).toHaveBeenCalledWith(
			expect.anything(),
			"c1",
			expect.objectContaining({ name: "Matemática Aplicada" }),
		);
	});
});
