import { describe, expect, it } from "vitest";

import { createRoleSchema } from "./schema";

describe("roles schema", () => {
	it("aceita papel válido", () => {
		const parsed = createRoleSchema.safeParse({ name: "Professor" });
		expect(parsed.success).toBe(true);
	});

	it("rejeita nome vazio", () => {
		const parsed = createRoleSchema.safeParse({ name: "" });
		expect(parsed.success).toBe(false);
	});
});
