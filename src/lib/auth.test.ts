import { describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";

describe("createAuth", () => {
	it("cria instância do better-auth com configurações mínimas", () => {
		const d1 = { prepare: vi.fn() } as unknown as D1Database;
		const env = {
			BETTER_AUTH_SECRET: "super-secret-32-bytes-long-ok",
			BETTER_AUTH_URL: "http://localhost:3000",
		} as Env;

		const auth = createAuth(d1, env);
		expect(auth).toBeDefined();
		expect(auth.handler).toBeTypeOf("function");
	});

	it("inclui origens locais e extras nas origens confiáveis", () => {
		const d1 = { prepare: vi.fn() } as unknown as D1Database;
		const env = {
			BETTER_AUTH_SECRET: "super-secret-32-bytes-long-ok",
			BETTER_AUTH_URL: "https://app.escola.exemplo",
			BETTER_AUTH_TRUSTED_ORIGINS:
				"https://preview.escola.exemplo, https://app.escola.exemplo",
		} as Env;

		const auth = createAuth(d1, env);
		const options = auth.options as unknown as { trustedOrigins: string[] };
		expect(options.trustedOrigins).toEqual(
			expect.arrayContaining([
				"https://app.escola.exemplo",
				"https://preview.escola.exemplo",
				"http://localhost:3001",
				"http://127.0.0.1:3001",
			]),
		);
		expect(new Set(options.trustedOrigins).size).toBe(
			options.trustedOrigins.length,
		);
	});
});
