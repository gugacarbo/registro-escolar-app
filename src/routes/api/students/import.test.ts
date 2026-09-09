import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { createStudent, listStudents } from "#/lib/students/repository";

import { importPreviewHandler } from "./import";
import { importResolveHandler } from "./import.resolve";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/students/repository", () => ({
	createStudent: vi.fn(),
	listStudents: vi.fn().mockResolvedValue([]),
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

describe("POST /api/students/import", () => {
	it("returns 401 when not authenticated", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students/import", {
			method: "POST",
		});
		const response = await importPreviewHandler({ request, context: { env } });
		expect(response.status).toBe(401);
	});

	it("returns 400 when file is missing", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request("http://localhost/api/students/import", {
			method: "POST",
			body: new FormData(),
		});
		const response = await importPreviewHandler({ request, context: { env } });
		expect(response.status).toBe(400);
	});

	it("returns 400 for an invalid file format", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const form = new FormData();
		form.append(
			"file",
			new File(["nome\nJoão"], "alunos.txt", { type: "text/plain" }),
		);
		const request = new Request("http://localhost/api/students/import", {
			method: "POST",
			body: form,
		});
		const response = await importPreviewHandler({ request, context: { env } });
		expect(response.status).toBe(400);
		const body = (await response.json()) as { errors: string[] };
		expect(body.errors[0]).toContain("Formato");
	});

	it("normalizes absent optional fields in preview rows", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStudents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const form = new FormData();
		form.append(
			"file",
			new File(["nome\nMaria Souza"], "alunos.csv", { type: "text/csv" }),
		);
		const request = new Request("http://localhost/api/students/import", {
			method: "POST",
			body: form,
		});
		const response = await importPreviewHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			rows: Array<Record<string, string>>;
		};
		expect(body.rows[0]).toMatchObject({
			document: "",
			registrationNumber: "",
			email: "",
			phone: "",
			birthDate: "",
			notes: "",
		});
	});

	it("returns preview with conflicts", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listStudents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([
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
		const form = new FormData();
		form.append(
			"file",
			new File(
				["nome,documento\nJoão Silva,123456\nMaria Souza,789012"],
				"alunos.csv",
				{ type: "text/csv" },
			),
		);
		const request = new Request("http://localhost/api/students/import", {
			method: "POST",
			body: form,
		});
		const response = await importPreviewHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			rows: Array<{ status: string }>;
			summary: Record<string, number>;
		};
		expect(body.summary.conflicts).toBe(1);
		expect(body.summary.valid).toBe(1);
	});

	it("keeps optional fields when resolving a create row", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createStudent as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "new-1",
			name: "Maria Souza",
			document: "123456",
			registrationNumber: "2026001",
			email: "maria@escola.test",
			phone: "11999999999",
			birthDate: new Date("2010-05-20"),
			notes: "Atendimento",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({
					rows: [
						{
							index: 1,
							action: "create",
							data: {
								name: "Maria Souza",
								document: "123456",
								registrationNumber: "2026001",
								email: "maria@escola.test",
								phone: "11999999999",
								birthDate: "2010-05-20",
								notes: "Atendimento",
							},
						},
					],
				}),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		expect(createMock).toHaveBeenCalledWith(expect.anything(), {
			name: "Maria Souza",
			document: "123456",
			registrationNumber: "2026001",
			email: "maria@escola.test",
			phone: "11999999999",
			birthDate: new Date("2010-05-20"),
			notes: "Atendimento",
		});
	});
});

describe("POST /api/students/import/resolve", () => {
	it("returns 401 when not authenticated", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{ method: "POST" },
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(401);
	});

	it("returns 400 when resolutions is not an array", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({ rows: "inválido" }),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(400);
	});

	it("returns 400 for an invalid action", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({ rows: [{ index: 1, action: "merge" }] }),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(400);
	});

	it("returns 400 when create has no name", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({
					rows: [{ index: 1, action: "create", data: {} }],
				}),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(400);
	});

	it("returns 400 when link without existingStudentId", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({ rows: [{ index: 2, action: "link" }] }),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(400);
	});

	it("creates, links and skips rows", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createStudent as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "new-1",
			name: "Maria Souza",
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
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({
					rows: [
						{ index: 1, action: "create", data: { name: "Maria Souza" } },
						{
							index: 2,
							action: "link",
							existingStudentId: "existing-1",
							data: { name: "João Silva" },
						},
						{ index: 3, action: "skip" },
					],
				}),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			created: number;
			linked: number;
			skipped: number;
		};
		expect(body.created).toBe(1);
		expect(body.linked).toBe(1);
		expect(body.skipped).toBe(1);
	});

	it("keeps optional fields when resolving a create row", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createStudent as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "new-1",
			name: "Maria Souza",
			document: "123456",
			registrationNumber: "2026001",
			email: "maria@escola.test",
			phone: "11999999999",
			birthDate: new Date("2010-05-20"),
			notes: "Atendimento",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const env = {
			DB: {} as D1Database,
			BETTER_AUTH_SECRET: "secret",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;
		const request = new Request(
			"http://localhost/api/students/import/resolve",
			{
				method: "POST",
				body: JSON.stringify({
					rows: [
						{
							index: 1,
							action: "create",
							data: {
								name: "Maria Souza",
								document: "123456",
								registrationNumber: "2026001",
								email: "maria@escola.test",
								phone: "11999999999",
								birthDate: "2010-05-20",
								notes: "Atendimento",
							},
						},
					],
				}),
			},
		);
		const response = await importResolveHandler({ request, context: { env } });
		expect(response.status).toBe(200);
		expect(createMock).toHaveBeenCalledWith(expect.anything(), {
			name: "Maria Souza",
			document: "123456",
			registrationNumber: "2026001",
			email: "maria@escola.test",
			phone: "11999999999",
			birthDate: new Date("2010-05-20"),
			notes: "Atendimento",
		});
	});
});
