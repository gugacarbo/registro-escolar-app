import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	countClasses,
	createClass,
	listAcademicPeriods,
	listClasses,
} from "#/lib/classes/repository";

import { createClassHandler, listClassesHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/classes/repository", () => ({
	countClasses: vi.fn().mockResolvedValue(0),
	createClass: vi.fn(),
	listAcademicPeriods: vi.fn().mockResolvedValue([]),
	listClasses: vi.fn().mockResolvedValue([]),
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

describe("GET /api/classes", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes", {
			method: "GET",
		});
		const response = await listClassesHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("propaga paginação com defaults e teto", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const listMock = listClasses as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValue([]);
		const capped = await listClassesHandler({
			request: new Request("http://localhost/api/classes?page=2&pageSize=999"),
			context: { env: createEnv() },
		});
		expect(capped.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({
				limit: 100,
				offset: 100,
				search: undefined,
				academicPeriod: undefined,
			}),
		);
		const defaulted = await listClassesHandler({
			request: new Request("http://localhost/api/classes?limit=0&offset=-1"),
			context: { env: createEnv() },
		});
		expect(defaulted.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({
				limit: 10,
				offset: 0,
				search: undefined,
				academicPeriod: undefined,
			}),
		);
	});

	it("mapeia limit/offset legados para page e pageSize", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const listMock = listClasses as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValue([]);
		const response = await listClassesHandler({
			request: new Request("http://localhost/api/classes?limit=10&offset=10"),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 10, offset: 10 }),
		);
		const body = (await response.json()) as {
			page: number;
			pageSize: number;
		};
		expect(body).toMatchObject({ page: 2, pageSize: 10 });
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes");
		const response = await listClassesHandler({
			request,
			context: {},
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 200 com o envelope paginado", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const listMock = listClasses as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([
			{ id: "t1", name: "7º A", academicPeriod: "2026", activeStudentCount: 3 },
		]);
		const countMock = countClasses as ReturnType<typeof vi.fn>;
		countMock.mockResolvedValueOnce(1);
		const periodsMock = listAcademicPeriods as ReturnType<typeof vi.fn>;
		periodsMock.mockResolvedValueOnce(["2026"]);
		const request = new Request("http://localhost/api/classes", {
			method: "GET",
		});
		const response = await listClassesHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			data: Array<{ name: string; activeStudentCount: number }>;
			total: number;
			page: number;
			pageSize: number;
			academicPeriods: string[];
		};
		expect(body.data).toHaveLength(1);
		expect(body.data[0].activeStudentCount).toBe(3);
		expect(body).toMatchObject({
			total: 1,
			page: 1,
			pageSize: 10,
			academicPeriods: ["2026"],
		});
		expect(countMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: undefined, academicPeriod: undefined }),
		);
	});

	it("propaga academicPeriod para listagem e contagem", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const listMock = listClasses as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValue([]);
		const countMock = countClasses as ReturnType<typeof vi.fn>;
		const response = await listClassesHandler({
			request: new Request("http://localhost/api/classes?academicPeriod=2026"),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ academicPeriod: "2026" }),
		);
		expect(countMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ academicPeriod: "2026" }),
		);
	});
});

describe("POST /api/classes", () => {
	it("retorna 401 sem autenticação", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "7º A", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com payload inválido", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 201 com a turma criada", async () => {
		const sessionMock = getSession as ReturnType<typeof vi.fn>;
		sessionMock.mockResolvedValueOnce(createMockSession());
		const createMock = createClass as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValueOnce({
			id: "t1",
			name: "7º A",
			academicPeriod: "2026",
		});
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "7º A", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({
			request,
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
	});

	it("resolve env via fallback no POST quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes", {
			method: "POST",
			body: JSON.stringify({ nome: "7º A", periodoLetivo: "2026" }),
		});
		const response = await createClassHandler({ request, context: {} });
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});
});
