import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	hasPermanentAdmin,
	markInvitationAccepted,
	validateInviteForRegistration,
} from "#/lib/invitations/repository";
import { authHandler } from "./$";

const mockAuthHandler = vi.fn();

vi.mock("#/db", () => ({
	createDb: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/auth", () => ({
	createAuth: vi.fn(() => ({
		handler: mockAuthHandler,
	})),
}));

vi.mock("#/lib/invitations/repository", () => ({
	hasPermanentAdmin: vi.fn(),
	validateInviteForRegistration: vi.fn(),
	markInvitationAccepted: vi.fn(),
}));

describe("Auth router /api/auth/$", () => {
	beforeEach(() => {
		mockAuthHandler.mockReset();
	});

	it("delega requisições normais (como sign-in) diretamente ao better-auth", async () => {
		mockAuthHandler.mockResolvedValue(new Response("ok", { status: 200 }));

		const request = new Request(
			"http://localhost:3000/api/auth/sign-in/email",
			{
				method: "POST",
				body: JSON.stringify({ email: "user@test.com", password: "pwd" }),
			},
		);

		const response = await authHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		expect(mockAuthHandler).toHaveBeenCalledTimes(1);
	});

	it("permite cadastro livre se o sistema ainda não tem admin permanente (setup inicial)", async () => {
		vi.mocked(hasPermanentAdmin).mockResolvedValue(false);
		mockAuthHandler.mockResolvedValue(
			new Response(JSON.stringify({ user: { id: "u1" } }), { status: 200 }),
		);

		const request = new Request(
			"http://localhost:3000/api/auth/sign-up/email",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Admin",
					email: "admin@test.com",
					password: "pwd",
				}),
			},
		);

		const response = await authHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		expect(mockAuthHandler).toHaveBeenCalledTimes(1);
		expect(markInvitationAccepted).not.toHaveBeenCalled();
	});

	it("bloqueia cadastro livre com 403 se já houver admin permanente e nenhum convite for fornecido", async () => {
		vi.mocked(hasPermanentAdmin).mockResolvedValue(true);

		const request = new Request(
			"http://localhost:3000/api/auth/sign-up/email",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Invasor",
					email: "invasor@test.com",
					password: "pwd",
				}),
			},
		);

		const response = await authHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(403);
		const json = (await response.json()) as { code: string };
		expect(json.code).toBe("INVITE_REQUIRED");
		expect(mockAuthHandler).not.toHaveBeenCalled();
	});

	it("retorna 400 se o convite fornecido for inválido", async () => {
		vi.mocked(hasPermanentAdmin).mockResolvedValue(true);
		vi.mocked(validateInviteForRegistration).mockResolvedValue({
			valid: false,
			error: "Convite expirado. Convites têm validade de 7 dias.",
		});

		const request = new Request(
			"http://localhost:3000/api/auth/sign-up/email",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-invite-token": "token-expirado",
				},
				body: JSON.stringify({
					name: "Convidado",
					email: "convidado@test.com",
					password: "pwd",
				}),
			},
		);

		const response = await authHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(400);
		const json = (await response.json()) as {
			code: string;
			message: string;
		};
		expect(json.code).toBe("INVALID_INVITATION");
		expect(json.message).toContain("expirado");
		expect(mockAuthHandler).not.toHaveBeenCalled();
	});

	it("permite cadastro com convite válido e marca como aceito", async () => {
		vi.mocked(hasPermanentAdmin).mockResolvedValue(true);
		vi.mocked(validateInviteForRegistration).mockResolvedValue({
			valid: true,
			invitation: { id: "inv-1" } as never,
		});
		mockAuthHandler.mockResolvedValue(
			new Response(JSON.stringify({ user: { id: "u2" } }), { status: 200 }),
		);

		const request = new Request(
			"http://localhost:3000/api/auth/sign-up/email",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-invite-token": "token-valido",
				},
				body: JSON.stringify({
					name: "Convidado",
					email: "convidado@test.com",
					password: "pwd",
				}),
			},
		);

		const response = await authHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		expect(mockAuthHandler).toHaveBeenCalledTimes(1);
		expect(markInvitationAccepted).toHaveBeenCalledWith(
			expect.anything(),
			"token-valido",
		);
	});
});
