import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import {
	countPendingInvitationsByUser,
	createInvitation,
	listInvitationsByUser,
} from "#/lib/invitations/repository";
import { createInvitationHandler, listInvitationsHandler } from "./index";

vi.mock("#/db", () => ({
	createDb: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/auth/session", () => ({
	getSession: vi.fn(),
}));

vi.mock("#/lib/invitations/repository", () => ({
	countPendingInvitationsByUser: vi.fn(),
	createInvitation: vi.fn(),
	listInvitationsByUser: vi.fn(),
	MAX_PENDING_INVITATIONS: 10,
}));

function mockSession() {
	return {
		user: {
			id: "u-1",
			name: "Professor",
			email: "prof@escola.test",
			role: "user",
		},
		session: { id: "s-1" },
	};
}

describe("invitations API", () => {
	it("rejeita listar convites se não autenticado (401)", async () => {
		vi.mocked(getSession).mockResolvedValue(null as never);

		const request = new Request("http://localhost:3000/api/invitations");
		const response = await listInvitationsHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(401);
	});

	it("lista convites do usuário autenticado e contagem pendente", async () => {
		vi.mocked(getSession).mockResolvedValue(mockSession() as never);
		vi.mocked(listInvitationsByUser).mockResolvedValue([
			{
				id: "inv-1",
				email: "dest@test.com",
				invitedById: "u-1",
				token: "tok",
				status: "pending",
				expiresAt: new Date(),
				createdAt: new Date(),
				acceptedAt: null,
			},
		]);
		vi.mocked(countPendingInvitationsByUser).mockResolvedValue(1);

		const request = new Request("http://localhost:3000/api/invitations");
		const response = await listInvitationsHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as {
			data: unknown[];
			pendingCount: number;
			maxPending: number;
		};
		expect(json.data).toHaveLength(1);
		expect(json.pendingCount).toBe(1);
		expect(json.maxPending).toBe(10);
	});

	it("cria convite com sucesso (201)", async () => {
		vi.mocked(getSession).mockResolvedValue(mockSession() as never);
		vi.mocked(createInvitation).mockResolvedValue({
			id: "inv-new",
			email: "novo@test.com",
			invitedById: "u-1",
			token: "tok-new",
			status: "pending",
			expiresAt: new Date(),
			createdAt: new Date(),
			acceptedAt: null,
		});

		const request = new Request("http://localhost:3000/api/invitations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "novo@test.com" }),
		});

		const response = await createInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(201);
		const json = (await response.json()) as { id: string };
		expect(json.id).toBe("inv-new");
	});

	it("rejeita convite com email inválido (400)", async () => {
		vi.mocked(getSession).mockResolvedValue(mockSession() as never);

		const request = new Request("http://localhost:3000/api/invitations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "email-invalido" }),
		});

		const response = await createInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(400);
	});

	it("retorna 409 quando o email já possui conta cadastrada", async () => {
		vi.mocked(getSession).mockResolvedValue(mockSession() as never);
		vi.mocked(createInvitation).mockRejectedValue(
			new Error("Este e-mail já possui uma conta cadastrada."),
		);

		const request = new Request("http://localhost:3000/api/invitations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "existente@test.com" }),
		});

		const response = await createInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(409);
		const json = (await response.json()) as { error: string };
		expect(json.error).toContain("já possui uma conta");
	});

	it("retorna 400 quando atinge o limite de 10 convites pendentes", async () => {
		vi.mocked(getSession).mockResolvedValue(mockSession() as never);
		vi.mocked(createInvitation).mockRejectedValue(
			new Error("Limite de 10 convites pendentes simultâneos atingido."),
		);

		const request = new Request("http://localhost:3000/api/invitations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "maisum@test.com" }),
		});

		const response = await createInvitationHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(400);
		const json = (await response.json()) as { error: string };
		expect(json.error).toContain("Limite de 10");
	});
});
