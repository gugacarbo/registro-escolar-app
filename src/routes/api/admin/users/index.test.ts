import { describe, expect, it, vi } from "vitest";
import { countUsers, listUsers } from "#/lib/admin-users/repository";
import { getSession } from "#/lib/auth/session";

import { listAdminUsersHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/admin-users/repository", () => ({
	countUsers: vi.fn().mockResolvedValue(0),
	listUsers: vi.fn().mockResolvedValue([]),
}));

function createMockSession(role = "admin") {
	const now = new Date();
	return {
		session: {
			id: "session-1",
			createdAt: now,
			updatedAt: now,
			userId: "admin-1",
			expiresAt: new Date(now.getTime() + 3600_000),
			token: "token-1",
		},
		user: {
			id: "admin-1",
			name: "Admin",
			email: "admin@example.com",
			emailVerified: true,
			role,
			isPermanentAdmin: true,
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

describe("GET /api/admin/users", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/admin/users", {
			method: "GET",
		});
		const response = await listAdminUsersHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Não autenticado");
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/admin/users", {
			method: "GET",
		});
		const response = await listAdminUsersHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 403 para sessão com papel user", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession("user"));
		const request = new Request("http://localhost/api/admin/users", {
			method: "GET",
		});
		const response = await listAdminUsersHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		expect(listUsers).not.toHaveBeenCalled();
	});

	it("retorna 200 com o envelope paginado e campos contratuais", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listUsers as ReturnType<typeof vi.fn>;
		const row = {
			id: "user-1",
			name: "Admin",
			email: "admin@example.com",
			role: "admin",
			isPermanentAdmin: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		listMock.mockResolvedValueOnce([row]);
		const countMock = countUsers as ReturnType<typeof vi.fn>;
		countMock.mockResolvedValueOnce(1);
		const request = new Request("http://localhost/api/admin/users?search=ad", {
			method: "GET",
		});
		const response = await listAdminUsersHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			data: Array<{
				id: string;
				name: string;
				email: string;
				role: string;
				isPermanentAdmin: boolean;
				createdAt: string;
				updatedAt: string;
			}>;
			total: number;
			page: number;
			pageSize: number;
		};
		expect(body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
		expect(body.data[0]).toMatchObject({
			id: "user-1",
			name: "Admin",
			email: "admin@example.com",
			role: "admin",
			isPermanentAdmin: true,
		});
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: "ad", limit: 10, offset: 0 }),
		);
		expect(countMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: "ad" }),
		);
	});

	it("mapeia limit/offset legados para page e pageSize", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listUsers as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const request = new Request(
			"http://localhost/api/admin/users?page=2&pageSize=5",
			{ method: "GET" },
		);
		const response = await listAdminUsersHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 5, offset: 5 }),
		);
		const body = (await response.json()) as { page: number; pageSize: number };
		expect(body).toMatchObject({ page: 2, pageSize: 5 });
	});
});
