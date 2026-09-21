import { beforeEach, describe, expect, it, vi } from "vitest";

import { addMeetingClassHandler, listMeetingClassesHandler } from "./index";

vi.mock("#/db", () => ({ createDb: vi.fn(() => ({})) }));
vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/classes/repository", () => ({ findClassById: vi.fn() }));
vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn(),
}));
vi.mock("#/lib/meetings/repository", () => ({
	addMeetingClass: vi.fn(),
	findMeetingById: vi.fn(),
}));
vi.mock("#/middleware/d1", () => ({ d1Middleware: [] }));

const { createDb } = await import("#/db");
const { getSession } = await import("#/lib/auth/session");
const { findClassById } = await import("#/lib/classes/repository");
const { requireD1 } = await import("#/lib/cloudflare-env");
const { addMeetingClass, findMeetingById } = await import(
	"#/lib/meetings/repository"
);

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getSession).mockReset();
	vi.mocked(findMeetingById).mockReset();
	vi.mocked(findClassById).mockReset();
	vi.mocked(addMeetingClass).mockReset();
});

const createdAt = new Date("2026-01-01T00:00:00Z");
const updatedAt = new Date("2026-01-01T00:00:00Z");

describe("GET /api/meetings/:meetingId/classes", () => {
	it("retorna vínculos com dados da turma", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({ id: "meeting-1" } as never);
		vi.mocked(createDb).mockReturnValue({
			query: {
				meetingClasses: {
					findMany: vi.fn().mockResolvedValue([
						{
							id: "link-1",
							meetingId: "meeting-1",
							classId: "class-1",
							createdAt,
							updatedAt,
							class: { id: "class-1", name: "Turma A" },
						},
					]),
				},
			},
		} as never);

		const response = await listMeetingClassesHandler({
			request: new Request("http://localhost"),
			context: {},
			params: { meetingId: "meeting-1" },
		});
		const body = (await response.json()) as Array<Record<string, unknown>>;
		expect(response.status).toBe(200);
		expect(body[0]).toMatchObject({
			id: "link-1",
			classId: "class-1",
			class: { id: "class-1", name: "Turma A" },
		});
	});

	it("retorna 401 sem autenticação", async () => {
		vi.mocked(getSession).mockResolvedValue(null);
		const response = await listMeetingClassesHandler({
			request: new Request("http://localhost"),
			context: {},
			params: { meetingId: "meeting-1" },
		});
		expect(response.status).toBe(401);
	});
});

describe("POST /api/meetings/:meetingId/classes", () => {
	function post(body: unknown) {
		return addMeetingClassHandler({
			request: new Request("http://localhost/api/meetings/meeting-1/classes", {
				method: "POST",
				body: JSON.stringify(body),
			}),
			context: {},
			params: { meetingId: "meeting-1" },
		});
	}

	it("retorna 401 sem autenticação", async () => {
		vi.mocked(getSession).mockResolvedValue(null);
		expect((await post({ classId: "class-1" })).status).toBe(401);
	});

	it("retorna 400 sem classId", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		expect((await post({})).status).toBe(400);
	});

	it("retorna 404 quando a reunião não existe", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue(undefined);
		expect((await post({ classId: "class-1" })).status).toBe(404);
	});

	it("retorna 404 quando a turma não existe", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({ id: "meeting-1" } as never);
		vi.mocked(findClassById).mockResolvedValue(undefined);
		expect((await post({ classId: "class-1" })).status).toBe(404);
	});

	it("retorna 201 ao vincular turma em andamento (borda 8)", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({
			id: "meeting-1",
			status: "in_progress",
		} as never);
		vi.mocked(findClassById).mockResolvedValue({
			id: "class-1",
			name: "Turma A",
		} as never);
		vi.mocked(addMeetingClass).mockResolvedValue({
			id: "link-1",
			meetingId: "meeting-1",
			classId: "class-1",
		} as never);
		const response = await post({ classId: "class-1" });
		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({
			id: "link-1",
			classId: "class-1",
			class: { id: "class-1", name: "Turma A" },
		});
	});

	it("retorna 409 quando a reunião está finalizada (borda 10)", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({
			id: "meeting-1",
			status: "finished",
		} as never);
		vi.mocked(findClassById).mockResolvedValue({
			id: "class-1",
			name: "Turma A",
		} as never);
		const { MeetingNotEditableError } = await import("#/lib/meetings/errors");
		vi.mocked(addMeetingClass).mockRejectedValue(
			new MeetingNotEditableError(
				"Reunião finalizada: reabra para editar dados e turmas",
			),
		);
		const response = await post({ classId: "class-1" });
		expect(response.status).toBe(409);
	});
});
