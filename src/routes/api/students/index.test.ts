import { describe, expect, it, vi } from "vitest";
import { getSession } from "#/lib/auth/session";
import {
	createStudent,
	findStudentsByNameOrDocument,
} from "#/lib/students/repository";

import { createStudentHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/students/repository", () => ({
	createStudent: vi.fn(),
	findStudentsByNameOrDocument: vi.fn().mockResolvedValue([]),
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

describe("POST /api/students", () => {
	it("returns 401 when not authenticated", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students", {
			method: "POST",
			body: JSON.stringify({ name: "João" }),
		});
		const response = await createStudentHandler({ request, context: { env } });
		expect(response.status).toBe(401);
	});

	it("returns 400 when name is empty", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students", {
			method: "POST",
			body: JSON.stringify({ name: "" }),
		});
		const response = await createStudentHandler({ request, context: { env } });
		expect(response.status).toBe(400);
	});

	it("returns 201 and creates student", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createStudent as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "uuid-1",
			name: "João Silva",
			document: null,
			registrationNumber: null,
			email: null,
			phone: null,
			birthDate: null,
			notes: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students", {
			method: "POST",
			body: JSON.stringify({ name: "João Silva" }),
		});
		const response = await createStudentHandler({ request, context: { env } });
		expect(response.status).toBe(201);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("João Silva");
	});

	it("returns 409 when student already exists", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findStudentsByNameOrDocument as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce([
			{
				id: "existing-1",
				name: "João Silva",
				document: "123456",
				registrationNumber: null,
				email: null,
				phone: null,
				birthDate: null,
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students", {
			method: "POST",
			body: JSON.stringify({ name: "João Silva", document: "123456" }),
		});
		const response = await createStudentHandler({ request, context: { env } });
		expect(response.status).toBe(409);
	});
});
