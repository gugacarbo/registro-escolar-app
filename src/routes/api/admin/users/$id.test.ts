import { describe, expect, it, vi } from "vitest";
import {
	deleteUserWithCascade,
	findUserById,
	updateUserRole,
} from "#/lib/admin-users/repository";
import { getSession } from "#/lib/auth/session";

import { deleteUserHandler, updateUserRoleHandler } from "./$id/index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/admin-users/repository", () => ({
	deleteUserWithCascade: vi.fn(),
	findUserById: vi.fn().mockResolvedValue(undefined),
	updateUserRole: vi.fn(),
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

function createTarget(overrides: Record<string, unknown> = {}) {
	const now = new Date();
	return {
		id: "user-2",
		name: "Outro",
		email: "outro@example.com",
		emailVerified: true,
		image: null,
		role: "user",
		isPermanentAdmin: false,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function createEnv() {
	return {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "secret",
		BETTER_AUTH_URL: "http://localhost:3000",
	} as Env;
}

async function patchRequest(body: unknown) {
	return new Request("http://localhost/api/admin/users/user-2", {
		method: "PATCH",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

describe("PATCH /api/admin/users/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "admin" }),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 403 para sessão com papel user", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession("user"));
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "admin" }),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		expect(findUserById).not.toHaveBeenCalled();
	});

	it("retorna 400 para papel fora do conjunto permitido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "superuser" }),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
		expect(findUserById).not.toHaveBeenCalled();
	});

	it("retorna 400 quando o corpo não traz papel", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateUserRoleHandler({
			request: await patchRequest({}),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 400 para corpo inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateUserRoleHandler({
			request: await patchRequest("não é json"),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando o usuário não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(undefined);
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "admin" }),
			params: { id: "user-missing" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
	});

	it("rejeita alteração da própria conta", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(
			createTarget({ id: "admin-1", isPermanentAdmin: false }),
		);
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "user" }),
			params: { id: "admin-1" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Você não pode alterar a própria conta");
		expect(updateUserRole).not.toHaveBeenCalled();
	});

	it("rejeita alteração do administrador permanente", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(createTarget({ isPermanentAdmin: true }));
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "user" }),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("O administrador permanente não pode ser alterado");
		expect(updateUserRole).not.toHaveBeenCalled();
	});

	it("atualiza o papel de outro user", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(createTarget());
		const updateMock = updateUserRole as ReturnType<typeof vi.fn>;
		updateMock.mockResolvedValueOnce(createTarget({ role: "admin" }));
		const response = await updateUserRoleHandler({
			request: await patchRequest({ role: "admin" }),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { role: string };
		expect(body.role).toBe("admin");
		expect(updateMock).toHaveBeenCalledWith(
			expect.anything(),
			"user-2",
			"admin",
		);
	});
});

describe("DELETE /api/admin/users/:id", () => {
	async function deleteRequest() {
		return new Request("http://localhost/api/admin/users/user-2", {
			method: "DELETE",
		});
	}

	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 403 para sessão com papel user", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession("user"));
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
	});

	it("retorna 404 quando o usuário não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(undefined);
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "user-missing" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
	});

	it("rejeita exclusão da própria conta", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(createTarget({ id: "admin-1" }));
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "admin-1" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Você não pode excluir a própria conta");
		expect(deleteUserWithCascade).not.toHaveBeenCalled();
	});

	it("rejeita exclusão do administrador permanente", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(
			createTarget({ isPermanentAdmin: true, role: "admin" }),
		);
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("O administrador permanente não pode ser excluído");
		expect(deleteUserWithCascade).not.toHaveBeenCalled();
	});

	it("rejeita exclusão de outra conta admin", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce(createTarget({ role: "admin" }));
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(403);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Somente usuários comuns podem ser excluídos");
		expect(deleteUserWithCascade).not.toHaveBeenCalled();
	});

	it("exclui outro user em cascata", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findUserById as ReturnType<typeof vi.fn>;
		const target = createTarget();
		findMock.mockResolvedValueOnce(target);
		const deleteMock = deleteUserWithCascade as ReturnType<typeof vi.fn>;
		const response = await deleteUserHandler({
			request: await deleteRequest(),
			params: { id: "user-2" },
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { id: string };
		expect(body.id).toBe("user-2");
		expect(deleteMock).toHaveBeenCalledWith(expect.anything(), "user-2");
	});
});
