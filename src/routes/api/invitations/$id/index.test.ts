import { describe, expect, it, vi } from "vitest";

import { getSession } from "#/lib/auth/session";
import { revokeInvitation } from "#/lib/invitations/repository";
import { revokeInvitationHandler } from "./index";

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
	revokeInvitation: vi.fn(),
}));

describe("DELETE /api/invitations/:id", () => {
	it("rejeita se não autenticado", async () => {
		vi.mocked(getSession).mockResolvedValue(null as never);

		const request = new Request("http://localhost:3000/api/invitations/inv-1", {
			method: "DELETE",
		});
		const response = await revokeInvitationHandler({
			request,
			params: { id: "inv-1" },
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(401);
	});

	it("revoga convite com sucesso", async () => {
		vi.mocked(getSession).mockResolvedValue({
			user: { id: "u-1" },
		} as never);
		vi.mocked(revokeInvitation).mockResolvedValue({
			id: "inv-1",
			status: "revoked",
		} as never);

		const request = new Request("http://localhost:3000/api/invitations/inv-1", {
			method: "DELETE",
		});
		const response = await revokeInvitationHandler({
			request,
			params: { id: "inv-1" },
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = (await response.json()) as { status: string };
		expect(json.status).toBe("revoked");
	});

	it("retorna 404 se convite não for encontrado", async () => {
		vi.mocked(getSession).mockResolvedValue({
			user: { id: "u-1" },
		} as never);
		vi.mocked(revokeInvitation).mockRejectedValue(
			new Error("Convite não encontrado."),
		);

		const request = new Request("http://localhost:3000/api/invitations/inv-9", {
			method: "DELETE",
		});
		const response = await revokeInvitationHandler({
			request,
			params: { id: "inv-9" },
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(404);
	});
});
