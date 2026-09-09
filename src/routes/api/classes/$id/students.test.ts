import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { listStudentsByClassAtDate } from "#/lib/enrollments/repository";

import { listClassStudentsHandler } from "./students";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/classes/repository", () => ({
	findClassById: vi.fn(),
}));

vi.mock("#/lib/enrollments/repository", () => ({
	listStudentsByClassAtDate: vi.fn().mockResolvedValue([]),
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

function getRequest(date: string | null) {
	const url =
		date === null
			? "http://localhost/api/classes/t1/students"
			: `http://localhost/api/classes/t1/students?date=${date}`;
	return new Request(url, { method: "GET" });
}

describe("GET /api/classes/:id/students", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await listClassStudentsHandler({
			request: getRequest("2026-03-01"),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 sem date ou com formato inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValue(createMockSession());
		const missing = await listClassStudentsHandler({
			request: getRequest(null),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(missing.status).toBe(400);
		const invalid = await listClassStudentsHandler({
			request: getRequest("01-03-2026"),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(invalid.status).toBe(400);
	});

	it("retorna 404 quando turma não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await listClassStudentsHandler({
			request: getRequest("2026-03-01"),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 com lista vazia fora de vínculo", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(
			listStudentsByClassAtDate as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce([]);
		const response = await listClassStudentsHandler({
			request: getRequest("2026-01-01"),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("retorna 200 com alunos e vínculo serializado", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(
			listStudentsByClassAtDate as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce([
			{
				student: { id: "a1", name: "João Silva" },
				enrollment: {
					id: "e1",
					startDate: new Date(Date.UTC(2026, 1, 1)),
					endDate: null,
					status: "ativa",
				},
			},
		]);
		const response = await listClassStudentsHandler({
			request: getRequest("2026-03-01"),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual([
			{
				student: { id: "a1", name: "João Silva" },
				enrollment: {
					id: "e1",
					startDate: "2026-02-01",
					endDate: null,
					status: "ativa",
				},
			},
		]);
	});
});
