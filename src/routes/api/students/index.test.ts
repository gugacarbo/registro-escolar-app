import { describe, expect, it, vi } from "vitest";
import { getSession } from "#/lib/auth/session";
import {
	countStudents,
	createStudent,
	findStudentsByNameOrDocument,
	listStudents,
} from "#/lib/students/repository";

import { createStudentHandler, listStudentsHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/students/repository", () => ({
	countStudents: vi.fn().mockResolvedValue(0),
	createStudent: vi.fn(),
	findStudentsByNameOrDocument: vi.fn().mockResolvedValue([]),
	listStudents: vi.fn().mockResolvedValue([]),
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

describe("GET /api/students", () => {
	it("returns 401 when not authenticated", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students", {
			method: "GET",
		});
		const response = await listStudentsHandler({ request, context: { env } });
		expect(response.status).toBe(401);
	});

	it("resolves env via runtime fallback when context env is absent", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/students", {
			method: "GET",
		});
		const response = await listStudentsHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
	});

	it("returns 200 with the paginated envelope", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStudents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([{ id: "student-1", name: "João Silva" }]);
		const countMock = countStudents as ReturnType<typeof vi.fn>;
		countMock.mockResolvedValueOnce(1);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students?search=João", {
			method: "GET",
		});
		const response = await listStudentsHandler({ request, context: { env } });
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

	it("lists without search and applies defaults with invalid params", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStudents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students?page=0", {
			method: "GET",
		});
		const response = await listStudentsHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 10, offset: 0, search: undefined }),
		);
		const body = (await response.json()) as { page: number; pageSize: number };
		expect(body).toMatchObject({ page: 1, pageSize: 10 });
	});

	it("caps the pageSize at the maximum allowed", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStudents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students?page=2&pageSize=999",
			{ method: "GET" },
		);
		const response = await listStudentsHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 100, offset: 100 }),
		);
		const body = (await response.json()) as { page: number; pageSize: number };
		expect(body).toMatchObject({ page: 2, pageSize: 100 });
	});

	it("maps legacy limit/offset params to page and pageSize", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStudents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students?limit=10&offset=10",
			{ method: "GET" },
		);
		const response = await listStudentsHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 10, offset: 10 }),
		);
		const body = (await response.json()) as { page: number; pageSize: number };
		expect(body).toMatchObject({ page: 2, pageSize: 10 });
	});
});

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

	it("resolves env via runtime fallback when context env is absent", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/students", {
			method: "POST",
			body: JSON.stringify({ name: "João" }),
		});
		const response = await createStudentHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(sessionMock).toHaveBeenCalledWith(request, undefined);
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

	it("returns 409 when an existing student has no document", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findStudentsByNameOrDocument as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce([
			{
				id: "existing-1",
				name: "João Silva",
				document: null,
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
	it("creates a student when neither name nor document matches", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const findMock = findStudentsByNameOrDocument as ReturnType<typeof vi.fn>;
		findMock.mockResolvedValueOnce([
			{
				id: "existing-1",
				name: "Maria Souza",
				document: "999999",
				registrationNumber: null,
				email: null,
				phone: null,
				birthDate: null,
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const createMock = createStudent as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "new-1",
			name: "João Silva",
			document: "123456",
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
			body: JSON.stringify({ name: "João Silva", document: "123456" }),
		});
		const response = await createStudentHandler({ request, context: { env } });
		expect(response.status).toBe(201);
	});
});
