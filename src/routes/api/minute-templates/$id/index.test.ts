import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	findMinuteTemplateById,
	updateMinuteTemplate,
} from "#/lib/minutes/repository";
import { textDoc } from "#/lib/minutes/tiptap/serializer";

import { getMinuteTemplateHandler, updateMinuteTemplateHandler } from "./index";

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/minutes/repository", () => ({
	findMinuteTemplateById: vi.fn(),
	updateMinuteTemplate: vi.fn(),
}));

vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(async () => createEnv()),
	requireD1: vi.fn(() => ({}) as D1Database),
}));

function createSession() {
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

function createEnv() {
	return {
		DB: {} as D1Database,
		BETTER_AUTH_SECRET: "secret",
		BETTER_AUTH_URL: "http://localhost:3000",
	} as Env;
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
	const headerContent =
		overrides.headerContent !== undefined
			? typeof overrides.headerContent === "object" &&
				overrides.headerContent !== null
				? JSON.stringify(overrides.headerContent)
				: String(overrides.headerContent)
			: JSON.stringify(textDoc("Cabeçalho"));
	const footerContent =
		overrides.footerContent !== undefined
			? typeof overrides.footerContent === "object" &&
				overrides.footerContent !== null
				? JSON.stringify(overrides.footerContent)
				: String(overrides.footerContent)
			: JSON.stringify(textDoc("Rodapé"));

	return {
		id: "template-1",
		name: "Modelo padrão",
		showMeeting: true,
		showClasses: true,
		showParticipants: true,
		showRecords: true,
		showGeneralReports: true,
		showSignatures: true,
		bodyContent: JSON.stringify(textDoc("Conteúdo")),
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		...overrides,
		headerContent,
		footerContent,
	};
}

function updatePayload() {
	return {
		name: "Modelo revisado",
		headerContent: textDoc("Novo cabeçalho"),
		footerContent: textDoc("Novo rodapé"),
		showMeeting: true,
		showClasses: false,
		showParticipants: true,
		showRecords: true,
		showGeneralReports: false,
		showSignatures: true,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("GET /api/minute-templates/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(null);

		const response = await getMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "template-1" },
		});

		expect(response.status).toBe(401);
	});

	it("retorna 404 para template inexistente", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());
		vi.mocked(findMinuteTemplateById).mockResolvedValueOnce(undefined);

		const response = await getMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/missing", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: "Modelo de ata não encontrado",
		});
	});

	it("retorna o template solicitado", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());
		vi.mocked(findMinuteTemplateById).mockResolvedValueOnce(makeTemplate());

		const response = await getMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "GET",
			}),
			context: { env: createEnv() },
			params: { id: "template-1" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			id: "template-1",
			name: "Modelo padrão",
		});
	});

	it("obtém o ambiente padrão quando context.env não é fornecido", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());
		vi.mocked(findMinuteTemplateById).mockResolvedValueOnce(makeTemplate());

		const response = await getMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "GET",
			}),
			context: {},
			params: { id: "template-1" },
		});

		expect(response.status).toBe(200);
	});
});

describe("PATCH /api/minute-templates/:id", () => {
	it("retorna 401 sem autenticação", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(null);

		const response = await updateMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "PATCH",
				body: JSON.stringify(updatePayload()),
			}),
			context: { env: createEnv() },
			params: { id: "template-1" },
		});

		expect(response.status).toBe(401);
	});

	it("retorna 400 quando o corpo não é JSON", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());

		const response = await updateMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "PATCH",
				body: "json inválido",
			}),
			context: { env: createEnv() },
			params: { id: "template-1" },
		});

		expect(response.status).toBe(400);
	});
	it("retorna 400 com dados inválidos", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());

		const response = await updateMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "PATCH",
				body: JSON.stringify({ name: "" }),
			}),
			context: { env: createEnv() },
			params: { id: "template-1" },
		});

		expect(response.status).toBe(400);
	});

	it("retorna 404 quando o template não existe", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());
		vi.mocked(findMinuteTemplateById).mockResolvedValueOnce(undefined);

		const response = await updateMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/missing", {
				method: "PATCH",
				body: JSON.stringify(updatePayload()),
			}),
			context: { env: createEnv() },
			params: { id: "missing" },
		});

		expect(response.status).toBe(404);
	});

	it("persiste e retorna as alterações do template", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());
		vi.mocked(findMinuteTemplateById).mockResolvedValueOnce(makeTemplate());
		vi.mocked(updateMinuteTemplate).mockResolvedValueOnce(
			makeTemplate({ ...updatePayload() }),
		);

		const response = await updateMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "PATCH",
				body: JSON.stringify(updatePayload()),
			}),
			context: { env: createEnv() },
			params: { id: "template-1" },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as {
			name: string;
			headerContent: string;
		};
		expect(json).toMatchObject({
			name: "Modelo revisado",
		});
		expect(JSON.parse(json.headerContent).content[0].content[0].text).toBe(
			"Novo cabeçalho",
		);
		expect(updateMinuteTemplate).toHaveBeenCalledWith(
			expect.anything(),
			"template-1",
			expect.objectContaining(updatePayload()),
		);
	});

	it("obtém o ambiente padrão quando context.env não é fornecido ao atualizar", async () => {
		vi.mocked(getSession).mockResolvedValueOnce(createSession());
		vi.mocked(findMinuteTemplateById).mockResolvedValueOnce(makeTemplate());
		vi.mocked(updateMinuteTemplate).mockResolvedValueOnce(makeTemplate());

		const response = await updateMinuteTemplateHandler({
			request: new Request("http://localhost/api/minute-templates/template-1", {
				method: "PATCH",
				body: JSON.stringify(updatePayload()),
			}),
			context: {},
			params: { id: "template-1" },
		});

		expect(response.status).toBe(200);
	});
});
