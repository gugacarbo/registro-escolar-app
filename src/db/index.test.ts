import { describe, expect, it, vi } from "vitest";
import { createDb } from "./index";

describe("createDb", () => {
	it("retorna uma instância de db com o schema injetado", () => {
		const d1 = { prepare: vi.fn() } as unknown as D1Database;
		const db = createDb(d1);
		expect(db).toBeDefined();
		expect(db.$client).toBe(d1);
	});
});
