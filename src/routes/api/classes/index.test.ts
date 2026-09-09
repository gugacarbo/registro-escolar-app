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

	it("propaga paginação com defaults e teto", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const listMock = listClasses as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValue([]);
		const capped = await listClassesHandler({
			request: new Request("http://localhost/api/classes?limit=999&offset=2"),
			context: { env: createEnv() },
		});
		expect(capped.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 200, offset: 2, search: undefined }),
		);
		const defaulted = await listClassesHandler({
			request: new Request("http://localhost/api/classes?limit=0&offset=-1"),
			context: { env: createEnv() },
		});
		expect(defaulted.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 50, offset: 0, search: undefined }),
		);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes");
		const response = await listClassesHandler({
			request,
			context: {},
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
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

	it("resolve env via fallback no POST quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "7º A", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});
});
