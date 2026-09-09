import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	createComponent,
	findComponentByNormalizedName,
	listComponents,
} from "#/lib/components/repository";

import { createComponentHandler, listComponentsHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/components/repository", () => ({
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

	it("retorna 200 com a lista de componentes", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(listComponents as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ id: "c1", name: "Matemática" },
		]);
		const response = await listComponentsHandler({
			request: new Request("http://localhost/api/components", {
				method: "GET",
			}),
			context: { env: createEnv() },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{ name: string }>;
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("Matemática");
	});

	it("propaga search/limit/offset com defaults e teto", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const listMock = listComponents as ReturnType<typeof vi.fn>;
		listMock.mockResolvedValue([]);

		const capped = await listComponentsHandler({
			request: new Request(
				"http://localhost/api/components?limit=999&offset=2",
				{
					method: "GET",
				},
			),
			context: { env: createEnv() },
		});
		expect(capped.status).toBe(200);
		expect(listMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ limit: 200, offset: 2 }),
		);

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
			expect.objectContaining({ limit: 50, offset: 0 }),
		);
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
});
