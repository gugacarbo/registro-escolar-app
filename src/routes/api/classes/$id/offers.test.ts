import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { findComponentById } from "#/lib/components/repository";
import {
	createOffer,
	DuplicateOfferError,
	InvalidProfessorError,
	listOffersByClass,
} from "#/lib/offers/repository";

import { createOfferHandler, listOffersHandler } from "./offers";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/classes/repository", () => ({
	findClassById: vi.fn(),
}));

vi.mock("#/lib/components/repository", () => ({
	findComponentById: vi.fn(),
}));

vi.mock("#/lib/offers/repository", () => ({
	DuplicateOfferError: class DuplicateOfferError extends Error {},
	InvalidProfessorError: class InvalidProfessorError extends Error {},
	createOffer: vi.fn(),
	listOffersByClass: vi.fn().mockResolvedValue([]),
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

function post(body: unknown) {
	return new Request("http://localhost/api/classes/t1/offers", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

describe("GET /api/classes/:id/offers", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await listOffersHandler({
			request: new Request("http://localhost/api/classes/t1/offers", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 404 quando a turma não existe", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await listOffersHandler({
			request: new Request("http://localhost/api/classes/t1/offers", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 com as ofertas da turma (relations inclusas)", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		const offer = {
			id: "o1",
			classId: "t1",
			component: { id: "c1", name: "Matemática" },
			professors: [{ id: "op1", staffId: "p1", staff: { name: "João" } }],
		};
		(listOffersByClass as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			offer,
		]);
		const response = await listOffersHandler({
			request: new Request("http://localhost/api/classes/t1/offers", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([offer]);
		expect(listOffersByClass).toHaveBeenCalledWith(expect.anything(), "t1");
	});
});

describe("POST /api/classes/:id/offers", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await createOfferHandler({
			request: post({ componenteId: "c1" }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 quando componenteId está ausente ou vazio", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValue(
			createMockSession(),
		);
		const missing = await createOfferHandler({
			request: post({}),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(missing.status).toBe(400);
		const empty = await createOfferHandler({
			request: post({ componenteId: "" }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(empty.status).toBe(400);
	});

	it("retorna 404 quando a turma não existe", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createOfferHandler({
			request: post({ componenteId: "c1" }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 404 quando o componente não existe", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createOfferHandler({
			request: post({ componenteId: "nope" }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 400 quando algum professor é inválido", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
		});
		(createOffer as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new InvalidProfessorError("Professor inválido ou inativo"),
		);
		const response = await createOfferHandler({
			request: post({ componenteId: "c1", professorIds: ["p1"] }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 409 quando o componente já foi ofertado na turma", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
		});
		(createOffer as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new DuplicateOfferError("Componente já ofertado nesta turma"),
		);
		const response = await createOfferHandler({
			request: post({ componenteId: "c1" }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 201 com professorIds vazio (oferta sem professor)", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
		});
		(createOffer as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "o1",
			classId: "t1",
			componentId: "c1",
		});
		const response = await createOfferHandler({
			request: post({ componenteId: "c1", professorIds: [] }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(201);
		expect(createOffer).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				classId: "t1",
				componentId: "c1",
				professorIds: [],
			}),
		);
	});

	it("retorna 201 e mapeia componenteId → componentId com professores", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
		});
		(createOffer as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "o2",
			classId: "t1",
			componentId: "c1",
		});
		const response = await createOfferHandler({
			request: post({ componenteId: "c1", professorIds: ["p1", "p2"] }),
			context: { env: createEnv() },
			params: { id: "t1" },
		});
		expect(response.status).toBe(201);
		expect(createOffer).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				componentId: "c1",
				professorIds: ["p1", "p2"],
			}),
		);
	});

	it("relança erro inesperado do repository", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			createMockSession(),
		);
		(findClassById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "t1",
		});
		(findComponentById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "c1",
		});
		(createOffer as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("boom"),
		);
		await expect(
			createOfferHandler({
				request: post({ componenteId: "c1" }),
				context: { env: createEnv() },
				params: { id: "t1" },
			}),
		).rejects.toThrow("boom");
	});
});
