import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { createEnrollmentWithTransfer } from "#/lib/enrollments/repository";
import { findStudentById } from "#/lib/students/repository";

import { createEnrollmentHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/students/repository", () => ({
	findStudentById: vi.fn(),
}));

vi.mock("#/lib/classes/repository", () => ({
	findClassById: vi.fn(),
}));

vi.mock("#/lib/enrollments/repository", () => ({
	createEnrollmentWithTransfer: vi.fn(),
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

function postRequest(body: unknown) {
	return new Request("http://localhost/api/enrollments", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

const validBody = {
	alunoId: "a1",
	turmaId: "t1",
	dataInicio: "2026-02-01",
	status: "ativa",
};

describe("POST /api/enrollments", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const response = await createEnrollmentHandler({
			request: postRequest(validBody),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const response = await createEnrollmentHandler({
			request: postRequest({ ...validBody, dataInicio: "01/02/2026" }),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando aluno não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createEnrollmentHandler({
			request: postRequest(validBody),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 404 quando turma não existe", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "a1",
		});
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createEnrollmentHandler({
			request: postRequest(validBody),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 com vínculo sobreposto", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "a1",
		});
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(
			createEnrollmentWithTransfer as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({ conflict: { id: "e1" } });
		const response = await createEnrollmentHandler({
			request: postRequest(validBody),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(409);
		const body = (await response.json()) as {
			conflictingEnrollment: unknown;
		};
		expect(body.conflictingEnrollment).toEqual({ id: "e1" });
	});

	it("retorna 201 com vínculo e encerrados na transferência", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		(findStudentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "a1",
		});
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(
			createEnrollmentWithTransfer as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			enrollment: { id: "e2" },
			closedEnrollments: [{ id: "e1" }],
		});
		const response = await createEnrollmentHandler({
			request: postRequest(validBody),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as {
			enrollment: unknown;
			closedEnrollments: unknown;
		};
		expect(body.enrollment).toEqual({ id: "e2" });
		expect(body.closedEnrollments).toEqual([{ id: "e1" }]);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = postRequest(validBody);
		const response = await createEnrollmentHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});
});
