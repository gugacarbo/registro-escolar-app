import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { countMinutes, listMinutes } from "#/lib/minutes/repository";

import { listMinutesHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/minutes/repository", () => ({
	countMinutes: vi.fn().mockResolvedValue(0),
	listMinutes: vi.fn().mockResolvedValue([]),
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

describe("GET /api/minutes/", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await listMinutesHandler({
			request: new Request("http://localhost/api/minutes/", { method: "GET" }),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/minutes/", {
			method: "GET",
		});
		const response = await listMinutesHandler({
			request,
			context: {},
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 200 com o envelope paginado", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listMinutes as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{
				id: "minute-1",
				meetingId: "meeting-1",
				meetingTitle: "Reunião 1",
				templateName: "Modelo padrão",
				approvalStatus: "aprovada",
				approvedAt: null,
				currentVersion: 1,
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		]);
		(countMinutes as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
		const response = await listMinutesHandler({
			request: new Request("http://localhost/api/minutes/", { method: "GET" }),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			data: Array<{ meetingTitle: string }>;
			total: number;
			page: number;
			pageSize: number;
		};
		expect(body.data).toHaveLength(1);
		expect(body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
	});

	it("repassa busca e filtro de aprovação para o repository e o count", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listMinutes as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
		const response = await listMinutesHandler({
			request: new Request(
				"http://localhost/api/minutes/?search=conselho&approvalStatus=aprovada",
				{ method: "GET" },
			),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMinutes).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				search: "conselho",
				approvalStatus: "aprovada",
			}),
		);
		expect(countMinutes).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				search: "conselho",
				approvalStatus: "aprovada",
			}),
		);
	});

	it("ignora approvalStatus inválido sem quebrar a listagem", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listMinutes as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
		const response = await listMinutesHandler({
			request: new Request("http://localhost/api/minutes/?approvalStatus=foo", {
				method: "GET",
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMinutes).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ approvalStatus: undefined }),
		);
	});

	it("normaliza paginação inválida", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listMinutes as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
		const response = await listMinutesHandler({
			request: new Request(
				"http://localhost/api/minutes/?page=2&pageSize=999",
				{
					method: "GET",
				},
			),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMinutes).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 100, offset: 100 }),
		);
		const body = (await response.json()) as {
			page: number;
			pageSize: number;
		};
		expect(body).toMatchObject({ page: 2, pageSize: 100 });
	});
});
