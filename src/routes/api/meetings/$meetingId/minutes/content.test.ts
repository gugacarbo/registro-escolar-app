import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { MinuteNotEditableError } from "#/lib/minutes/errors";
import {
	getMinuteEditableContent,
	updateMinuteContent,
} from "#/lib/minutes/repository";

import { getMinuteContentHandler, updateMinuteContentHandler } from "./content";

vi.mock("#/db", () => ({
	createDb: vi.fn(() => ({})),
}));

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/minutes/repository", () => ({
	getMinuteEditableContent: vi.fn(),
	updateMinuteContent: vi.fn(),
}));

vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(async () => ({ DB: {} })),
	requireD1: vi.fn(() => ({})),
}));

function session() {
	const now = new Date();
	return {
		session: {
			id: "session-1",
			createdAt: now,
			updatedAt: now,
			userId: "operator-1",
			expiresAt: new Date(now.getTime() + 3600_000),
			token: "token-1",
		},
		user: {
			id: "operator-1",
			name: "Operador",
			email: "op@example.com",
			emailVerified: true,
			role: "user",
			isPermanentAdmin: false,
			createdAt: now,
			updatedAt: now,
		},
	};
}

const content = {
	presetId: "preset-1",
	presetName: "Preset Conselho",
	headerContent: '{"type":"doc","content":[{"type":"paragraph"}]}',
	bodyContent: '{"type":"doc","content":[{"type":"paragraph"}]}',
	footerContent: '{"type":"doc","content":[{"type":"paragraph"}]}',
};

function request(method: string, body?: unknown) {
	return new Request(
		"http://localhost/api/meetings/meeting-1/minutes/content",
		{
			method,
			body: body === undefined ? undefined : JSON.stringify(body),
		},
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("GET /api/meetings/:meetingId/minutes/content", () => {
	it("retorna 401 sem autenticação", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(null);

		const response = await getMinuteContentHandler({
			request: request("GET"),
			context: { env: {} as Env },
			params: { meetingId: "meeting-1" },
		});

		expect(response.status).toBe(401);
	});

	it("retorna o conteúdo editável da reunião", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(session());
		vi.mocked(getMinuteEditableContent).mockResolvedValueOnce(content);

		const response = await getMinuteContentHandler({
			request: request("GET"),
			context: { env: {} as Env },
			params: { meetingId: "meeting-1" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(content);
	});
});

describe("PATCH /api/meetings/:meetingId/minutes/content", () => {
	it("valida os três campos editáveis", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(session());

		const response = await updateMinuteContentHandler({
			request: request("PATCH", { bodyContent: "inválido" }),
			context: { env: {} as Env },
			params: { meetingId: "meeting-1" },
		});

		expect(response.status).toBe(400);
		expect(updateMinuteContent).not.toHaveBeenCalled();
	});

	it("salva e retorna o conteúdo editado", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(session());
		vi.mocked(updateMinuteContent).mockResolvedValueOnce({
			id: "minute-1",
			meetingId: "meeting-1",
		} as never);

		const response = await updateMinuteContentHandler({
			request: request("PATCH", content),
			context: { env: {} as Env },
			params: { meetingId: "meeting-1" },
		});

		expect(response.status).toBe(200);
		expect(updateMinuteContent).toHaveBeenCalledWith({}, "meeting-1", {
			headerContent: content.headerContent,
			bodyContent: content.bodyContent,
			footerContent: content.footerContent,
		});
	});

	it("retorna conflito quando a reunião está encerrada", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(session());
		vi.mocked(updateMinuteContent).mockRejectedValueOnce(
			new MinuteNotEditableError("Reunião encerrada: reabra para editar a ata"),
		);

		const response = await updateMinuteContentHandler({
			request: request("PATCH", content),
			context: { env: {} as Env },
			params: { meetingId: "meeting-1" },
		});

		expect(response.status).toBe(409);
	});
});
