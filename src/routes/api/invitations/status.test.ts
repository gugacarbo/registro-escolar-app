import { describe, expect, it, vi } from "vitest";

import { hasPermanentAdmin } from "#/lib/invitations/repository";
import { registrationStatusHandler } from "./status";

vi.mock("#/db", () => ({
	createDb: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/cloudflare-env", () => ({
	getRuntimeEnv: vi.fn(),
	requireD1: vi.fn().mockReturnValue({}),
}));

vi.mock("#/lib/invitations/repository", () => ({
	hasPermanentAdmin: vi.fn(),
}));

describe("GET /api/invitations/status", () => {
	it("retorna setup inicial quando não há usuários/admin", async () => {
		vi.mocked(hasPermanentAdmin).mockResolvedValue(false);

		const request = new Request("http://localhost:3000/api/invitations/status");
		const response = await registrationStatusHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json).toEqual({
			open: true,
			isInitialSetup: true,
			requiresInvite: false,
		});
	});

	it("retorna que exige convite quando já existe admin permanente", async () => {
		vi.mocked(hasPermanentAdmin).mockResolvedValue(true);

		const request = new Request("http://localhost:3000/api/invitations/status");
		const response = await registrationStatusHandler({
			request,
			context: { env: { DB: {} as D1Database } as Env },
		});

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json).toEqual({
			open: false,
			isInitialSetup: false,
			requiresInvite: true,
		});
	});
});
