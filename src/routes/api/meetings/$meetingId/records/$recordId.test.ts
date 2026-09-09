import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findMeetingById } from "#/lib/meetings/repository";
import {
	InvalidOriginError,
	RecordNotFoundError,
	RecordNotLinkedToMeetingError,
} from "#/lib/records/errors";
import { updateLinkedRecord } from "#/lib/records/repository";

import { updateLinkedRecordHandler } from "./$recordId";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/meetings/repository", () => ({ findMeetingById: vi.fn() }));
vi.mock("#/lib/records/repository", () => ({ updateLinkedRecord: vi.fn() }));

function session() {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		session: { id: "s-1", userId: "u-1" },
		user: { id: "u-1", name: "Op" },
	});
}

function env() {
	return { DB: {} as D1Database, BETTER_AUTH_SECRET: "x" } as unknown as Env;
}

function patch(body: unknown) {
	return new Request("http://localhost/api/meetings/meeting-1/records/rec-1", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("PATCH /api/meetings/:id/records/:recordId", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "x" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "rec-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 409 quando a reunião está finalizada (borda 5)", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "finished",
		});
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "Editado" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "rec-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 404 quando o registro não existe", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "in_progress",
		});
		(updateLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new RecordNotFoundError("Registro não encontrado"),
		);
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "Editado" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando o registro pertence a outra reunião", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "in_progress",
		});
		(updateLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new RecordNotLinkedToMeetingError("outra"),
		);
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "Editado" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "rec-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 400 com corpo não-JSON", async () => {
		session();
		const request = new Request(
			"http://localhost/api/meetings/meeting-1/records/rec-1",
			{ method: "PATCH" },
		);
		const response = await updateLinkedRecordHandler({
			request,
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "rec-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando a reunião não existe", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "Editado" }),
			context: { env: env() },
			params: { meetingId: "missing", recordId: "rec-1" },
		});
		expect(response.status).toBe(404);
	});

	it("ignora 404 de erro com mensagem inesperada (rethrow genérico)", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "in_progress",
		});
		(updateLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new RecordNotFoundError("outro contexto"),
		);
		await expect(
			updateLinkedRecordHandler({
				request: patch({ texto: "Editado" }),
				context: { env: env() },
				params: { meetingId: "meeting-1", recordId: "rec-1" },
			}),
		).rejects.toThrow("outro contexto");
	});

	it("retorna 422 quando a origem não participa da reunião (borda 2)", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "in_progress",
		});
		(updateLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new InvalidOriginError("origem"),
		);
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "Editado", origemId: "p-9" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "rec-1" },
		});
		expect(response.status).toBe(422);
	});

	it("retorna 200 e atualiza o registro", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "in_progress",
		});
		(updateLinkedRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "rec-1",
			texto: "Editado",
		});
		const response = await updateLinkedRecordHandler({
			request: patch({ texto: "Editado", incluirNaAta: false }),
			context: { env: env() },
			params: { meetingId: "meeting-1", recordId: "rec-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { texto: string };
		expect(body.texto).toBe("Editado");
	});
});
