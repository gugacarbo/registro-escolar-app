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
});
