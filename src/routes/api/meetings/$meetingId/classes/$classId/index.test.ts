import { beforeEach, describe, expect, it, vi } from "vitest";

import { removeMeetingClassHandler } from "./index";

vi.mock("#/db", () => ({ createDb: vi.fn(() => ({})) }));
vi.mock("#/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn(),
}));
vi.mock("#/lib/meetings/repository", async () => {
	const actual = await vi.importActual<
		typeof import("#/lib/meetings/repository")
	>("#/lib/meetings/repository");
	return {
		...actual,
		findMeetingById: vi.fn(),
		removeMeetingClass: vi.fn(),
	};
});
vi.mock("#/middleware/d1", () => ({ d1Middleware: [] }));

const { getSession } = await import("#/lib/auth/session");
const { requireD1 } = await import("#/lib/cloudflare-env");
const { findMeetingById, removeMeetingClass } = await import(
	"#/lib/meetings/repository"
);
const { MeetingClassInUseError, MeetingNotEditableError } = await import(
	"#/lib/meetings/errors"
);

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getSession).mockReset();
	vi.mocked(findMeetingById).mockReset();
	vi.mocked(removeMeetingClass).mockReset();
});

function remove() {
	return removeMeetingClassHandler({
		request: new Request(
			"http://localhost/api/meetings/meeting-1/classes/class-1",
			{ method: "DELETE" },
		),
		context: {},
		params: { meetingId: "meeting-1", classId: "class-1" },
	});
}

describe("DELETE /api/meetings/:meetingId/classes/:classId", () => {
	it("retorna 401 sem autenticação", async () => {
		vi.mocked(getSession).mockResolvedValue(null);
		expect((await remove()).status).toBe(401);
	});

	it("retorna 404 quando a reunião não existe", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue(undefined);
		expect((await remove()).status).toBe(404);
	});

	it("retorna 200 ao desvincular em reunião aberta (borda 8)", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({
			id: "meeting-1",
			status: "open",
		} as never);
		vi.mocked(removeMeetingClass).mockResolvedValue(undefined as never);
		const response = await remove();
		expect(response.status).toBe(200);
		expect(removeMeetingClass).toHaveBeenCalledWith(
			expect.anything(),
			"meeting-1",
			"class-1",
		);
	});

	it("retorna 409 quando a turma possui acompanhamento (borda 9)", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({
			id: "meeting-1",
			status: "open",
		} as never);
		vi.mocked(removeMeetingClass).mockRejectedValue(
			new MeetingClassInUseError(
				"Turma com acompanhamento registrado: não é possível desvincular",
			),
		);
		const response = await remove();
		expect(response.status).toBe(409);
	});

	it("retorna 409 quando a reunião está encerrada (borda 1)", async () => {
		vi.mocked(getSession).mockResolvedValue({} as never);
		vi.mocked(requireD1).mockReturnValue({} as never);
		vi.mocked(findMeetingById).mockResolvedValue({
			id: "meeting-1",
			status: "closed",
		} as never);
		vi.mocked(removeMeetingClass).mockRejectedValue(
			new MeetingNotEditableError(
				"Reunião encerrada: reabra para editar dados, turmas e registros",
			),
		);
		expect((await remove()).status).toBe(409);
	});
});
