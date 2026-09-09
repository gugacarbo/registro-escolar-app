import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	countStaff,
	createStaff,
	findStaffById,
	findStaffByName,
	listStaff,
	softDeleteStaff,
} from "#/lib/staff/repository";
import { deleteStaffHandler } from "./$id/index";
import { createStaffHandler, listStaffHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/staff/repository", () => ({
	countStaff: vi.fn().mockResolvedValue(0),
	createStaff: vi.fn(),
	findStaffById: vi.fn(),
	findStaffByName: vi.fn().mockResolvedValue([]),
	listStaff: vi.fn().mockResolvedValue([]),
	softDeleteStaff: vi.fn(),
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

	it("retorna 200 com o envelope paginado", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStaff as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([{ id: "staff-1", name: "João Silva" }]);
		const countMock = countStaff as ReturnType<typeof vi.fn>;
		countMock.mockResolvedValueOnce(1);
		const request = new Request("http://localhost/api/staff?search=João", {
			method: "GET",
		});
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			data: Array<{ name: string }>;
			total: number;
			page: number;
			pageSize: number;
		};
		expect(body.data).toHaveLength(1);
		expect(body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: "João", limit: 10, offset: 0 }),
		);
		expect(countMock).toHaveBeenCalledWith(
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
			expect.objectContaining({ limit: 10, offset: 0, search: undefined }),
		);
	});

	it("restringe o pageSize ao máximo permitido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStaff as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const request = new Request(
			"http://localhost/api/staff?page=2&pageSize=999",
			{ method: "GET" },
		);
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 100, offset: 100 }),
		);
		const body = (await response.json()) as {
			page: number;
			pageSize: number;
		};
		expect(body).toMatchObject({ page: 2, pageSize: 100 });
	});

	it("mapeia limit/offset legados para page e pageSize", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStaff as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const request = new Request(
			"http://localhost/api/staff?limit=10&offset=10",
			{ method: "GET" },
		);
		const response = await listStaffHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 10, offset: 10 }),
		);
		const body = (await response.json()) as {
			page: number;
			pageSize: number;
		};
		expect(body).toMatchObject({ page: 2, pageSize: 10 });
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

describe("DELETE /api/staff/:id", () => {
	it("soft deletes staff and hides from active list", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const staff = { id: "staff-1", deletedAt: null };
		vi.mocked(findStaffById).mockResolvedValueOnce(staff as never);
		vi.mocked(softDeleteStaff).mockResolvedValueOnce({
			...staff,
			deletedAt: new Date(),
		} as never);
		const request = new Request("http://localhost/api/staff/staff-1", {
			method: "DELETE",
		});
		const response = await deleteStaffHandler({
			request,
			params: { id: "staff-1" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { deletedAt: string | null };
		expect(body.deletedAt).not.toBeNull();
	});

	it("returns 404 for missing or already deleted staff", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		vi.mocked(findStaffById).mockResolvedValueOnce(undefined);
		const request = new Request("http://localhost/api/staff/staff-missing", {
			method: "DELETE",
		});
		const response = await deleteStaffHandler({
			request,
			params: { id: "staff-missing" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
	});
});
