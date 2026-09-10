import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	findStaffById,
	softDeleteStaff,
	updateStaff,
} from "#/lib/staff/repository";

import { deleteStaffHandler, getStaffHandler, updateStaffHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/staff/repository", () => ({
	findStaffById: vi.fn(),
	updateStaff: vi.fn(),
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

beforeEach(() => {
	vi.clearAllMocks();
	(findStaffById as ReturnType<typeof vi.fn>).mockReset();
	(updateStaff as ReturnType<typeof vi.fn>).mockReset();
	(getSession as ReturnType<typeof vi.fn>).mockReset();
});

describe("GET /api/staff/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await getStaffHandler({
			request: new Request("http://localhost/api/staff/staff-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/staff/staff-1/", {
			method: "GET",
		});
		const response = await getStaffHandler({
			request,
			context: {},
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 quando o servidor não existe ou está deletado", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "staff-1",
			deletedAt: new Date(),
		});
		const response = await getStaffHandler({
			request: new Request("http://localhost/api/staff/staff-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Servidor não encontrado");
	});

	it("retorna 200 com o servidor", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "staff-1",
			name: "João Silva",
			deletedAt: null,
		});
		const response = await getStaffHandler({
			request: new Request("http://localhost/api/staff/staff-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { id: string };
		expect(body.id).toBe("staff-1");
	});
});

describe("PATCH /api/staff/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateStaffHandler({
			request: new Request("http://localhost/api/staff/staff-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Novo nome" }),
			}),
			context: { env: createEnv() },
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateStaffHandler({
			request: new Request("http://localhost/api/staff/staff-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: 42 }),
			}),
			context: { env: createEnv() },
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 no PATCH quando o servidor não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
		const response = await updateStaffHandler({
			request: new Request("http://localhost/api/staff/missing/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Novo" }),
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 e atualiza o servidor", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStaffById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "staff-1",
			name: "João Silva",
			deletedAt: null,
		});
		(updateStaff as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "staff-1",
			name: "João Souza",
			deletedAt: null,
		});
		const response = await updateStaffHandler({
			request: new Request("http://localhost/api/staff/staff-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "João Souza" }),
			}),
			context: { env: createEnv() },
			params: { id: "staff-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("João Souza");
		expect(updateStaff).toHaveBeenCalledWith(
			expect.anything(),
			"staff-1",
			expect.objectContaining({ name: "João Souza" }),
		);
	});
});

describe("DELETE /api/staff/:id", () => {
	it("retorna 200 e faz soft delete do servidor", async () => {
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

	it("retorna 404 para servidor inexistente ou já deletado", async () => {
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
