import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { findMeetingById } from "#/lib/meetings/repository";
import {
	RecordNotFoundError,
	RecordNotLinkedToMeetingError,
} from "#/lib/records/errors";
import { setIndependentRecordInclusion } from "#/lib/records/repository";

import { setRecordInclusionHandler } from "./include";

vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/meetings/repository", () => ({ findMeetingById: vi.fn() }));
vi.mock("#/lib/records/repository", () => ({
	setIndependentRecordInclusion: vi.fn(),
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
		status: "open",
	});
}

function patch(body: unknown) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/students/student-1/records/rec-1/include",
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("PATCH /api/meetings/:id/students/:studentId/records/:recordId/include", () => {
	it("retorna 401 sem autenticação", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: false }),
			context: { env: env() },
			params: {
				meetingId: "meeting-1",
				studentId: "student-1",
				recordId: "rec-1",
			},
		});
		expect(response.status).toBe(401);
	});

	it("retorna 400 quando incluir não é booleano", async () => {
		session();
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: "sim" }),
			context: { env: env() },
			params: {
				meetingId: "meeting-1",
				studentId: "student-1",
				recordId: "rec-1",
			},
		});
		expect(response.status).toBe(400);
	});

	it("retorna 404 quando o registro não existe", async () => {
		session();
		inProgressMeeting();
		(
			setIndependentRecordInclusion as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(new RecordNotFoundError("Registro não encontrado"));
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: false }),
			context: { env: env() },
			params: {
				meetingId: "meeting-1",
				studentId: "student-1",
				recordId: "missing",
			},
		});
		expect(response.status).toBe(404);
	});

	it("retorna 422 para registro vinculado a reunião", async () => {
		session();
		inProgressMeeting();
		(
			setIndependentRecordInclusion as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(new RecordNotLinkedToMeetingError("vinculado"));
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: false }),
			context: { env: env() },
			params: {
				meetingId: "meeting-1",
				studentId: "student-1",
				recordId: "rec-1",
			},
		});
		expect(response.status).toBe(422);
	});

	it("retorna 200 e grava a decisão sem tocar o registro original (borda 9)", async () => {
		session();
		inProgressMeeting();
		(
			setIndependentRecordInclusion as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({ id: "inc-1", include: false });
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: false }),
			context: { env: env() },
			params: {
				meetingId: "meeting-1",
				studentId: "student-1",
				recordId: "rec-1",
			},
		});
		expect(response.status).toBe(200);
		expect(setIndependentRecordInclusion).toHaveBeenCalledWith(
			expect.anything(),
			{ recordId: "rec-1", meetingId: "meeting-1", include: false },
		);
	});

	it("resolve env via fallback", async () => {
		(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
		const request = patch({ incluir: false });
		const response = await setRecordInclusionHandler({
			request,
			context: {},
			params: { meetingId: "meeting-1", studentId: "s1", recordId: "r1" },
		});
		expect(response.status).toBe(401);
		expect(getSession).toHaveBeenCalledWith(request, undefined);
	});

	it("retorna 404 para reunião inexistente", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			undefined,
		);
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: false }),
			context: { env: env() },
			params: { meetingId: "missing", studentId: "s1", recordId: "r1" },
		});
		expect(response.status).toBe(404);
	});

	it("retorna 409 quando a reunião está encerrada", async () => {
		session();
		(findMeetingById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: "meeting-1",
			status: "closed",
		});
		const response = await setRecordInclusionHandler({
			request: patch({ incluir: false }),
			context: { env: env() },
			params: { meetingId: "meeting-1", studentId: "s1", recordId: "r1" },
		});
		expect(response.status).toBe(409);
	});

	it("repropaga erro inesperado", async () => {
		session();
		inProgressMeeting();
		(
			setIndependentRecordInclusion as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(new Error("boom"));
		await expect(
			setRecordInclusionHandler({
				request: patch({ incluir: false }),
				context: { env: env() },
				params: { meetingId: "meeting-1", studentId: "s1", recordId: "r1" },
			}),
		).rejects.toThrow("boom");
	});
});
