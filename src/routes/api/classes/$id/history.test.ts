import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { getClassHistory } from "#/lib/history/repository";

import { getClassHistoryHandler } from "./history";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/history/repository", () => ({ getClassHistory: vi.fn() }));

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

describe("GET /api/classes/:id/history (spec 0012)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await getClassHistoryHandler({
			request: new Request("http://localhost/api/classes/class-1/history"),
			context: { env: env() },
			params: { id: "class-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 para query param inválido", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockSession(),
		);
		const response = await getClassHistoryHandler({
			request: new Request(
				"http://localhost/api/classes/class-1/history?foo=bar",
			),
			context: { env: env() },
			params: { id: "class-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 para turma inexistente", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockSession(),
		);
		(getClassHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await getClassHistoryHandler({
			request: new Request("http://localhost/api/classes/missing/history"),
			context: { env: env() },
			params: { id: "missing" },
		});
		expect(response.status).toBe(404);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Turma não encontrada");
	});

	it("retorna 200 com histórico da turma e repassa filtros", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockSession(),
		);
		const payload = { turma: { id: "class-1" }, eventos: [] };
		const mock = getClassHistory as ReturnType<typeof vi.fn>;
		mock.mockResolvedValueOnce(payload);
		const response = await getClassHistoryHandler({
			request: new Request(
				"http://localhost/api/classes/class-1/history?periodo=2025&q=x",
			),
			context: { env: env() },
			params: { id: "class-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as typeof payload;
		expect(body.turma.id).toBe("class-1");
		expect(mock).toHaveBeenCalledWith(
			expect.anything(),
			"class-1",
			expect.objectContaining({ periodo: "2025", q: "x" }),
		);
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/api/classes/class-1/history");
		const response = await getClassHistoryHandler({
			request,
			context: {},
			params: { id: "class-1" },
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});
});
