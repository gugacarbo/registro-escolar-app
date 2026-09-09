import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findMeetingById } from "#/lib/meetings/repository";
import { InvalidOriginError, RecordNotFoundError } from "#/lib/records/errors";
import {
	createLinkedRecord,
	listStudentRecordsForMeeting,
} from "#/lib/records/repository";

import {
	createLinkedRecordHandler,
	listMeetingStudentRecordsHandler,
} from "./index";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/meetings/repository", () => ({ findMeetingById: vi.fn() }));
vi.mock("#/lib/records/repository", () => ({
	createLinkedRecord: vi.fn(),
	listStudentRecordsForMeeting: vi.fn(),
}));

function session() {
	(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		session: { id: "s-1", userId: "u-1" },
		user: { id: "u-1", name: "Op" },
	});
}

function env() {
	return { DB: {} as D1Database, BETTER_AUTH_SECRET: "x" } as unknown as Env;
}

function inProgressMeeting() {
	(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		id: "meeting-1",
		status: "in_progress",
		heldAt: new Date("2025-06-10T12:00:00.000Z"),
	});
}

function post(body: unknown) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/students/student-1/records",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("GET /api/meetings/:id/students/:studentId/records", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await listMeetingStudentRecordsHandler({
			request: new Request("http://localhost/x"),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(401);
	});

	it("retorna 404 para reunião inexistente", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await listMeetingStudentRecordsHandler({
			request: new Request("http://localhost/x"),
			context: { env: env() },
			params: { meetingId: "missing", studentId: "student-1" },
		});
		expect(response.status).toBe(404);
	});

	it("lista registros com escopos vinculado e contexto", async () => {
		session();
		inProgressMeeting();
		(
			listStudentRecordsForMeeting as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce([{ id: "rec-1", scope: "contexto" }]);
		const response = await listMeetingStudentRecordsHandler({
			request: new Request("http://localhost/x"),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { records: unknown[] };
		expect(body.records).toHaveLength(1);
	});
});

describe("POST /api/meetings/:id/students/:studentId/records", () => {
	it("retorna 400 com texto vazio (borda 1)", async () => {
		session();
		const response = await createLinkedRecordHandler({
			request: post({ texto: "" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(400);
	});

	it("retorna 409 quando a reunião está finalizada (borda 5)", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "finished",
		});
		const response = await createLinkedRecordHandler({
			request: post({ texto: "Registro" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(409);
	});

	it("retorna 422 quando a origem não participa da reunião (borda 2)", async () => {
		session();
		inProgressMeeting();
		(createLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new InvalidOriginError("origem"),
		);
		const response = await createLinkedRecordHandler({
			request: post({ texto: "Registro", origemId: "p-9" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(422);
	});

	it("retorna 404 quando o aluno não existe", async () => {
		session();
		inProgressMeeting();
		(createLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new RecordNotFoundError("Aluno não encontrado"),
		);
		const response = await createLinkedRecordHandler({
			request: post({ texto: "Registro" }),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "missing" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 201 e aceita reunião reaberta (borda 5)", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "reopened",
		});
		(createLinkedRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "rec-1",
			meetingId: "meeting-1",
		});
		const response = await createLinkedRecordHandler({
			request: post({ texto: "Registro", incluirNaAta: false }),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(201);
	});

	it("resolve env via fallback no GET", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = new Request("http://localhost/x");
		const response = await listMeetingStudentRecordsHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("resolve env via fallback no POST", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = post({ texto: "x" });
		const response = await createLinkedRecordHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1", studentId: "student-1" },
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 para reunião inexistente no POST", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await createLinkedRecordHandler({
			request: post({ texto: "Registro" }),
			context: { env: env() },
			params: { meetingId: "missing", studentId: "student-1" },
		});
		expect(response.status).toBe(404);
	});

	it("repropaga erro inesperado no POST", async () => {
		session();
		inProgressMeeting();
		(createLinkedRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("boom"),
		);
		await expect(
			createLinkedRecordHandler({
				request: post({ texto: "Registro" }),
				context: { env: env() },
				params: { meetingId: "meeting-1", studentId: "student-1" },
			}),
		).rejects.toThrow("boom");
	});
});
