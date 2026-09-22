import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	MeetingNotClosedError,
	MinuteAlreadyApprovedError,
	MinuteNotFoundError,
	NoCurrentVersionError,
} from "#/lib/minutes/errors";
import { approveMinute } from "#/lib/minutes/repository";

import { approveHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/minutes/repository", () => ({ approveMinute: vi.fn() }));

function session() {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		session: { id: "s-1", userId: "u-1" },
		user: { id: "u-1", name: "Operador" },
	});
}

function env() {
	return { DB: {} as D1Database, BETTER_AUTH_SECRET: "x" } as unknown as Env;
}

function request(body: unknown = {}) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/minutes/approve",
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

function call(body: unknown = {}) {
	return approveHandler({
		request: request(body),
		context: { env: env() },
		params: { meetingId: "meeting-1" },
	});
}

function approvedMinute() {
	return {
		id: "minute-1",
		meetingId: "meeting-1",
		approvalStatus: "aprovada",
		approvedAt: new Date("2026-05-20T12:00:00.000Z"),
		approvalNotes: null,
	};
}

describe("PATCH /api/meetings/:id/minutes/approve", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		expect((await call()).status).toBe(401);
	});

	it("retorna 400 para payload inválido", async () => {
		session();
		expect((await call({ data: "não é data" })).status).toBe(400);
	});

	it("retorna 404 quando não existe ata gerada", async () => {
		session();
		(approveMinute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new MinuteNotFoundError("Nenhuma ata gerada para esta reunião"),
		);
		const response = await call();
		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({
			error: "Nenhuma ata gerada para esta reunião",
		});
	});

	it("retorna 409 quando a reunião ainda está aberta (borda 6 da 0010)", async () => {
		session();
		(approveMinute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new MeetingNotClosedError(
				"Reunião aberta: gere a ata para encerrar antes de aprová-la",
			),
		);
		const response = await call();
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			error: "Reunião aberta: gere a ata para encerrar antes de aprová-la",
		});
	});

	it("retorna 409 quando não há versão atual", async () => {
		session();
		(approveMinute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new NoCurrentVersionError("Não existe versão atual da ata para aprovar"),
		);
		expect((await call()).status).toBe(409);
	});

	it("retorna 409 quando a ata já foi aprovada", async () => {
		session();
		(approveMinute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new MinuteAlreadyApprovedError("Ata já aprovada"),
		);
		expect((await call()).status).toBe(409);
	});

	it("retorna 200 ao aprovar a versão atual", async () => {
		session();
		(approveMinute as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			approvedMinute(),
		);
		const response = await call({ data: "2026-05-20", observacao: "Ok" });
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			id: "minute-1",
			approvalStatus: "aprovada",
			approvedAt: "2026-05-20T12:00:00.000Z",
		});
	});
});
