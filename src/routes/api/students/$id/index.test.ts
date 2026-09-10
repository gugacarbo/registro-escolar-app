import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findStudentById, updateStudent } from "#/lib/students/repository";

import { getStudentHandler, updateStudentHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/students/repository", () => ({
	findStudentById: vi.fn(),
	updateStudent: vi.fn(),
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
	(findStudentById as ReturnType<typeof vi.fn>).mockReset();
	(updateStudent as ReturnType<typeof vi.fn>).mockReset();
	(getSession as ReturnType<typeof vi.fn>).mockReset();
});

describe("GET /api/students/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await getStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/students/student-1/", {
			method: "GET",
		});
		const response = await getStudentHandler({
			request,
			context: {},
			params: { id: "student-1" },
		});
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 quando o estudante não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await getStudentHandler({
			request: new Request("http://localhost/api/students/missing/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Estudante não encontrado");
	});

	it("retorna 200 com o estudante", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		const response = await getStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { id: string };
		expect(body.id).toBe("student-1");
	});
});

describe("PATCH /api/students/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await updateStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Novo nome" }),
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await updateStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "PATCH",
				body: JSON.stringify({ birthDate: "não-data" }),
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 no PATCH quando o estudante não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await updateStudentHandler({
			request: new Request("http://localhost/api/students/missing/", {
				method: "PATCH",
				body: JSON.stringify({ name: "Novo" }),
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 e atualiza o estudante", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		(updateStudent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Souza",
		});
		const response = await updateStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "João Souza" }),
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("João Souza");
	});

	it("converte birthDate ISO para Date no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		(updateStudent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		const request = new Request("http://localhost/api/students/student-1/", {
			method: "PATCH",
			body: JSON.stringify({ name: "João Silva", birthDate: "2010-05-20" }),
		});
		const response = await updateStudentHandler({
			request,
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(200);
		expect(sessionMock).toHaveBeenCalledWith(request, expect.anything());
		expect(updateStudent).toHaveBeenCalledWith(
			expect.anything(),
			"student-1",
			expect.objectContaining({
				name: "João Silva",
				birthDate: new Date("2010-05-20T00:00:00.000Z"),
			}),
		);
	});

	it("ignora birthDate vazio no PATCH", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		(updateStudent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		const response = await updateStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "PATCH",
				body: JSON.stringify({ name: "João Silva", birthDate: "" }),
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(200);
		expect(updateStudent).toHaveBeenCalledWith(
			expect.anything(),
			"student-1",
			expect.not.objectContaining({ birthDate: expect.anything() }),
		);
	});

	it("retorna 400 quando o corpo não é JSON", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "student-1",
			name: "João Silva",
		});
		const response = await updateStudentHandler({
			request: new Request("http://localhost/api/students/student-1/", {
				method: "PATCH",
				body: "not-json",
			}),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(400);
	});
});
