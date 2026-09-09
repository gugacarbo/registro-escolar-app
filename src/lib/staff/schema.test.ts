import { describe, expect, it } from "vitest";

import { createStaffSchema } from "./schema";

describe("staff schema", () => {
	it("aceita servidor válido", () => {
		const parsed = createStaffSchema.safeParse({ name: "João Silva" });
		expect(parsed.success).toBe(true);
	});

	it("rejeita nome vazio", () => {
		const parsed = createStaffSchema.safeParse({ name: "" });
		expect(parsed.success).toBe(false);
	});
});
