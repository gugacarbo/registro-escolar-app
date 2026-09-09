import { describe, expect, it, vi } from "vitest";

import { getRuntimeEnv, requireD1 } from "./cloudflare-env";

const fakeEnv = { DB: {} } as unknown as Env;

describe("getRuntimeEnv", () => {
	it("retorna o env do contexto quando presente", async () => {
		await expect(getRuntimeEnv({ env: fakeEnv })).resolves.toBe(fakeEnv);
	});

	it("retorna o env aninhado em cloudflare quando presente", async () => {
		await expect(getRuntimeEnv({ cloudflare: { env: fakeEnv } })).resolves.toBe(
			fakeEnv,
		);
	});

	it("retorna undefined quando nenhum env está disponível", async () => {
		await expect(getRuntimeEnv({})).resolves.toBeUndefined();
		await expect(getRuntimeEnv(undefined)).resolves.toBeUndefined();
	});
});

describe("requireD1", () => {
	it("retorna o binding D1 quando presente", () => {
		expect(requireD1(fakeEnv)).toBe(fakeEnv.DB);
	});

	it("lança erro quando o binding está ausente", () => {
		expect(() => requireD1(undefined)).toThrow("D1 binding not available");
		expect(() => requireD1({} as unknown as Env)).toThrowError(
			expect.objectContaining({ message: "D1 binding not available" }),
		);
		expect(vi.fn(() => requireD1(undefined))).toThrow();
	});
});
