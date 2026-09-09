import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	countComponents,
	createComponent,
	findComponentByNormalizedName,
	listComponents,
} from "#/lib/components/repository";

import { createComponentHandler, listComponentsHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/components/repository", () => ({
	countComponents: vi.fn().mockResolvedValue(0),
	createComponent: vi.fn(),
	findComponentByNormalizedName: vi.fn().mockResolvedValue(undefined),
	listComponents: vi.fn().mockResolvedValue([]),
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

describe("GET /api/components", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await listComponentsHandler({
			request: new Request("http://localhost/api/components", {
				method: "GET",
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 200 com o envelope paginado", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listComponents as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ id: "c1", name: "Matemática" },
		]);
		(countComponents as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
		const response = await listComponentsHandler({
			request: new Request("http://localhost/api/components", {
				method: "GET",
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			data: Array<{ name: string }>;
			total: number;
			page: number;
			pageSize: number;
		};
		expect(body.data).toHaveLength(1);
		expect(body.data[0].name).toBe("Matemática");
		expect(body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
		expect(countComponents).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: undefined }),
		);
	});

	it("propaga search/page/pageSize com defaults e teto", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const listMock = listComponents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValue([]);

		const capped = await listComponentsHandler({
			request: new Request(
				"http://localhost/api/components?page=2&pageSize=999",
				{
					method: "GET",
				},
			),
			context: { env: createEnv() },
		});
		expect(capped.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 100, offset: 100 }),
		);
		const cappedBody = (await capped.json()) as {
			page: number;
			pageSize: number;
		};
		expect(cappedBody).toMatchObject({ page: 2, pageSize: 100 });

		const defaulted = await listComponentsHandler({
			request: new Request(
				"http://localhost/api/components?limit=0&offset=-1",
				{
					method: "GET",
				},
			),
			context: { env: createEnv() },
		});
		expect(defaulted.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 10, offset: 0 }),
		);
	});

	it("mapeia limit/offset legados para page e pageSize", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		const listMock = listComponents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValueOnce([]);
		const response = await listComponentsHandler({
			request: new Request(
				"http://localhost/api/components?limit=10&offset=10",
				{ method: "GET" },
			),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		expect(listMock).toHaveBeenCalledWith(
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
		const request = new Request("http://localhost/api/components", {
			method: "GET",
		});
		const response = await listComponentsHandler({
			request,
			context: {},
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});
});

describe("POST /api/components", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await createComponentHandler({
			request: new Request("http://localhost/api/components", {
				method: "POST",
				body: JSON.stringify({ name: "Matemática" }),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com nome vazio", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		const response = await createComponentHandler({
			request: new Request("http://localhost/api/components", {
				method: "POST",
				body: JSON.stringify({ name: "" }),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 201 e cria o componente", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(createComponent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
			name: "Matemática",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const response = await createComponentHandler({
			request: new Request("http://localhost/api/components", {
				method: "POST",
				body: JSON.stringify({ name: "Matemática" }),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as { name: string };
		expect(body.name).toBe("Matemática");
	});

	it("retorna 409 com existingComponent quando nome duplicado (normalizado)", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(
			findComponentByNormalizedName as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			id: "c1",
			name: "Matemática",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const response = await createComponentHandler({
			request: new Request("http://localhost/api/components", {
				method: "POST",
				body: JSON.stringify({ name: "matematica" }),
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(409);
		const body = (await response.json()) as {
			error: string;
			existingComponent: { id: string };
		};
		expect(body.error).toBe("Componente já existe");
		expect(body.existingComponent.id).toBe("c1");
	});
	it("resolve env via fallback no POST quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/components", {
			method: "POST",
			body: JSON.stringify({ name: "Matemática" }),
		});
		const response = await createComponentHandler({
			request,
			context: {},
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});
});
