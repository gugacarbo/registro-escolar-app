import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { createIndependentRecord } from "#/lib/records/repository";

import { createIndependentRecordHandler } from "./records";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/records/repository", () => ({
	createIndependentRecord: vi.fn(),
}));

function createMockSession() {
	const now = new Date();
	return {
		session: { id: "s-1", userId: "u-1", token: "t", expiresAt: now },
		user: { id: "u-1", name: "Op", email: "op@example.com" },
	};
}

function createEnv() {
	return { DB: {} as D1Database, BETTER_AUTH_SECRET: "x" } as unknown as Env;
}

function postRequest(body: unknown) {
	return new Request("http://localhost/api/students/student-1/records", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/students/:id/records", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await createIndependentRecordHandler({
			request: postRequest({ texto: "x" }),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 quando o texto está vazio (borda 1)", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		const response = await createIndependentRecordHandler({
			request: postRequest({ texto: "   " }),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(400);
	});

	it("resolve env via fallback quando o corpo não é JSON", async () => {
		const request = new Request("http://localhost/api/students/s/records", {
			method: "POST",
		});
		const response = await createIndependentRecordHandler({
			request,
			context: {},
			params: { id: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 404 para aluno inexistente", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		const { RecordNotFoundError } = await import("#/lib/records/errors");
		(createIndependentRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new RecordNotFoundError("Aluno não encontrado"),
		);
		const response = await createIndependentRecordHandler({
			request: postRequest({ texto: "Registro" }),
			context: { env: createEnv() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 201 e cria registro independente", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(createIndependentRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			{
				id: "rec-1",
				studentId: "student-1",
				meetingId: null,
				includeInMinutes: true,
			},
		);
		const response = await createIndependentRecordHandler({
			request: postRequest({ texto: "Registro", turmaId: "class-1" }),
			context: { env: createEnv() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as { meetingId: null };
		expect(body.meetingId).toBeNull();
		expect(createIndependentRecord).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ studentId: "student-1", texto: "Registro" }),
		);
	});
});
