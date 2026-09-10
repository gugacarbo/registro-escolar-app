import { describe, expect, it, vi } from "vitest";

import { listMeetingClassesHandler } from "./index";

vi.mock("#/db", () => ({ createDb: vi.fn(() => ({})) }));
vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn(),
}));
vi.mock("#/lib/meetings/repository", () => ({ findMeetingById: vi.fn() }));
vi.mock("#/middleware/d1", () => ({ d1Middleware: [] }));

const { createDb } = await import("#/db");
const { getSession } = await import("#/lib/auth/session");
const { requireD1 } = await import("#/lib/cloudflare-env");
const { findMeetingById } = await import("#/lib/meetings/repository");

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
