import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { getStudentHistory } from "#/lib/history/repository";

import { getStudentHistoryHandler } from "./history";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/history/repository", () => ({ getStudentHistory: vi.fn() }));

function mockSession() {
	const now = new Date();
	return {
		session: { id: "s-1", userId: "u-1", token: "t", expiresAt: now },
		user: { id: "u-1", name: "Op", email: "op@example.com" },
	};
}

function env() {
	return { DB: {} as D1Database, BETTER_AUTH_SECRET: "x" } as unknown as Env;
}

describe("GET /api/students/:id/history (spec 0011)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await getStudentHistoryHandler({
			request: new Request("http://localhost/api/students/student-1/history"),
			context: { env: env() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 para query param inválido (schema .strict())", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockSession(),
		);
		const response = await getStudentHistoryHandler({
			request: new Request(
				"http://localhost/api/students/student-1/history?foo=bar",
			),
			context: { env: env() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 para estudante inexistente", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockSession(),
		);
		(getStudentHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await getStudentHistoryHandler({
			request: new Request("http://localhost/api/students/missing/history"),
			context: { env: env() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Estudante não encontrado");
	});

	it("retorna 200 com linha do tempo e repassa filtros", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockSession(),
		);
		const payload = { estudante: { id: "student-1" }, eventos: [] };
		const mock = getStudentHistory as ReturnType<typeof vi.fn>;
		mock.mockResolvedValueOnce(payload);
		const response = await getStudentHistoryHandler({
			request: new Request(
				"http://localhost/api/students/student-1/history?turmaId=class-1&reuniaoId=meeting-1&categoriaId=cat-1&componenteId=comp-1&q=texto",
			),
			context: { env: env() },
			params: { id: "student-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as typeof payload;
		expect(body.estudante.id).toBe("student-1");
		expect(mock).toHaveBeenCalledWith(
			expect.anything(),
			"student-1",
			expect.objectContaining({
				turmaId: "class-1",
				reuniaoId: "meeting-1",
				categoriaId: "cat-1",
				componenteId: "comp-1",
				q: "texto",
			}),
		);
	});
});
