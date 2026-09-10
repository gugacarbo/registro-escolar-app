import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { ERR_INVALID_ORIGIN } from "#/lib/general-reports/errors";
import {
	createGeneralReport,
	listGeneralReportsByMeeting,
} from "#/lib/general-reports/repository";
import { findMeetingById } from "#/lib/meetings/repository";

import { createGeneralReportHandler, listGeneralReportsHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/general-reports/repository", () => ({
	createGeneralReport: vi.fn(),
	listGeneralReportsByMeeting: vi.fn(),
}));
vi.mock("#/lib/meetings/repository", () => ({ findMeetingById: vi.fn() }));

function session() {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		session: { id: "s-1", userId: "u-1" },
		user: { id: "u-1", name: "Op" },
	});
}

function env() {
	return { DB: {} as D1Database, BETTER_AUTH_SECRET: "x" } as unknown as Env;
}

function meeting(status = "in_progress") {
	(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "meeting-1",
		status,
	});
}

function get() {
	return new Request("http://localhost/api/meetings/meeting-1/general-reports");
}

function post(body: unknown) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/general-reports",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: typeof body === "string" ? body : JSON.stringify(body),
		},
	);
}

function row() {
	return {
		id: "rep-1",
		meetingId: "meeting-1",
		originId: null,
		categoryId: null,
		texto: "Relato",
		includeInMinutes: true,
		createdAt: new Date("2025-06-10T12:00:00.000Z"),
		updatedAt: new Date("2025-06-10T12:00:00.000Z"),
	};
}

describe("GET /api/meetings/:id/general-reports", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await listGeneralReportsHandler({
			request: get(),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 404 para reunião inexistente", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await listGeneralReportsHandler({
			request: get(),
			context: { env: env() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 200 com relatos serializados", async () => {
		session();
		meeting();
		(
			listGeneralReportsByMeeting as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce([row()]);
		const response = await listGeneralReportsHandler({
			request: get(),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{
			id: string;
			createdAt: string;
		}>;
		expect(body).toHaveLength(1);
		expect(body[0].createdAt).toBe("2025-06-10T12:00:00.000Z");
	});

	it("resolve env via fallback quando o contexto não traz env", async () => {
		const response = await listGeneralReportsHandler({
			request: get(),
			context: {},
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});
});

describe("POST /api/meetings/:id/general-reports", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await createGeneralReportHandler({
			request: post({ texto: "Relato" }),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com texto vazio (borda 4)", async () => {
		session();
		const response = await createGeneralReportHandler({
			request: post({ texto: "  " }),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 400 com corpo não-JSON", async () => {
		session();
		const response = await createGeneralReportHandler({
			request: post("not-json"),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 para reunião inexistente", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createGeneralReportHandler({
			request: post({ texto: "Relato" }),
			context: { env: env() },
			params: { meetingId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando a reunião está finalizada (borda 3)", async () => {
		session();
		meeting("finished");
		const response = await createGeneralReportHandler({
			request: post({ texto: "Relato" }),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 422 quando a origem não participa da reunião (borda 1)", async () => {
		session();
		meeting();
		(createGeneralReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error(ERR_INVALID_ORIGIN),
		);
		const response = await createGeneralReportHandler({
			request: post({ texto: "Relato", origemId: "p-9" }),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(422);
	});

	it("retorna 201 e serializa o relato criado", async () => {
		session();
		meeting();
		(createGeneralReport as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			row(),
		);
		const response = await createGeneralReportHandler({
			request: post({ texto: "Relato", incluirNaAta: false }),
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(201);
		const body = (await response.json()) as { texto: string };
		expect(body.texto).toBe("Relato");
	});

	it("resolve env via fallback no POST", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = post({ texto: "Relato" });
		const response = await createGeneralReportHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 400 quando o corpo do POST não é JSON", async () => {
		session();
		meeting();
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/general-reports",
			{ method: "POST", body: "not-json" },
		);
		const response = await createGeneralReportHandler({
			request,
			context: { env: env() },
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(400);
	});
});
