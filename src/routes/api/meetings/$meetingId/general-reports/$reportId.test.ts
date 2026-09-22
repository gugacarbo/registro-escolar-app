import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	InvalidOriginError,
	MeetingNotInProgressError,
	ReportNotFoundError,
} from "#/lib/general-reports/errors";
import { updateGeneralReport } from "#/lib/general-reports/repository";
import { findMeetingById } from "#/lib/meetings/repository";

import { updateGeneralReportHandler } from "./$reportId";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/general-reports/repository", () => ({
	updateGeneralReport: vi.fn(),
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

function meeting(status = "open") {
	(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "meeting-1",
		status,
	});
}

function patch(body: unknown) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/general-reports/rep-1",
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("PATCH /api/meetings/:id/general-reports/:reportId", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "Novo" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 com texto vazio (borda 4)", async () => {
		session();
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 para reunião inexistente", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "Novo" }),
			context: { env: env() },
			params: { meetingId: "missing", reportId: "rep-1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 404 quando o relato não existe", async () => {
		session();
		meeting();
		(updateGeneralReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new ReportNotFoundError("Relato geral não encontrado"),
		);
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "Novo" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando a reunião está encerrada (borda 3)", async () => {
		session();
		meeting("closed");
		(updateGeneralReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new MeetingNotInProgressError("encerrada"),
		);
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "Novo" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 422 quando a origem não participa da reunião (borda 1)", async () => {
		session();
		meeting();
		(updateGeneralReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new InvalidOriginError("origem"),
		);
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "Novo", origemId: "p-9" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(422);
	});

	it("retorna 200 e serializa o relato editado", async () => {
		session();
		meeting();
		(updateGeneralReport as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "rep-1",
			meetingId: "meeting-1",
			originId: null,
			categoryId: null,
			texto: "Novo",
			includeInMinutes: false,
			createdAt: new Date("2025-06-10T12:00:00.000Z"),
			updatedAt: new Date("2025-06-10T12:00:00.000Z"),
		});
		const response = await updateGeneralReportHandler({
			request: patch({ texto: "Novo", incluirNaAta: false }),
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { texto: string };
		expect(body.texto).toBe("Novo");
	});

	it("resolve env via fallback", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = patch({ texto: "Novo" });
		const response = await updateGeneralReportHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 400 quando o corpo não é JSON", async () => {
		session();
		meeting();
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/general-reports/rep-1",
			{ method: "PATCH", body: "not-json" },
		);
		const response = await updateGeneralReportHandler({
			request,
			context: { env: env() },
			params: { meetingId: "meeting-1", reportId: "rep-1" },
		});
		expect(response.status).toBe(400);
	});
});
