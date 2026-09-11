import { describe, expect, it, vi } from "vitest";

import { findInvitationByToken } from "#/lib/invitations/repository";
import { verifyInvitationHandler } from "./verify";

vi.mock("#/db", () => ({
	createDb: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/invitations/repository", () => ({
	findInvitationByToken: vi.fn(),
}));

describe("GET /api/invitations/verify", () => {
	it("retorna 400 se token não for fornecido", async () => {
		const request = new Request("http://localhost:3000/api/invitations/verify");
		const response = await verifyInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(400);
		const json = (await response.json()) as { valid: boolean };
		expect(json.valid).toBe(false);
	});

	it("retorna valid: false se convite não for encontrado", async () => {
		vi.mocked(findInvitationByToken).mockResolvedValue(null);

		const request = new Request(
			"http://localhost:3000/api/invitations/verify?token=inexistente",
		);
		const response = await verifyInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as {
			valid: boolean;
			error?: string;
		};
		expect(json.valid).toBe(false);
		expect(json.error).toContain("não encontrado");
	});

	it("retorna valid: false se convite não for pendente", async () => {
		vi.mocked(findInvitationByToken).mockResolvedValue({
			id: "inv-1",
			email: "convidado@escola.test",
			token: "tok-1",
			invitedById: "u1",
			status: "accepted",
			expiresAt: new Date(Date.now() + 100000),
			createdAt: new Date(),
			acceptedAt: new Date(),
		});

		const request = new Request(
			"http://localhost:3000/api/invitations/verify?token=tok-1",
		);
		const response = await verifyInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as {
			valid: boolean;
			error?: string;
		};
		expect(json.valid).toBe(false);
		expect(json.error).toContain("já foi utilizado");
	});

	it("retorna valid: false se convite expirou", async () => {
		vi.mocked(findInvitationByToken).mockResolvedValue({
			id: "inv-1",
			email: "convidado@escola.test",
			token: "tok-1",
			invitedById: "u1",
			status: "pending",
			expiresAt: new Date(Date.now() - 1000),
			createdAt: new Date(),
			acceptedAt: null,
		});

		const request = new Request(
			"http://localhost:3000/api/invitations/verify?token=tok-1",
		);
		const response = await verifyInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as {
			valid: boolean;
			error?: string;
		};
		expect(json.valid).toBe(false);
		expect(json.error).toContain("expirou");
	});

	it("retorna valid: true e o email quando o convite é válido", async () => {
		const future = new Date(Date.now() + 100000);
		vi.mocked(findInvitationByToken).mockResolvedValue({
			id: "inv-1",
			email: "convidado@escola.test",
			token: "tok-1",
			invitedById: "u1",
			status: "pending",
			expiresAt: future,
			createdAt: new Date(),
			acceptedAt: null,
		});

		const request = new Request(
			"http://localhost:3000/api/invitations/verify?token=tok-1",
		);
		const response = await verifyInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as {
			valid: boolean;
			email?: string;
		};
		expect(json.valid).toBe(true);
		expect(json.email).toBe("convidado@escola.test");
	});
});
