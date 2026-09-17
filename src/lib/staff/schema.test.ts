import { describe, expect, it } from "vitest";

import { createStaffSchema } from "./schema";

describe("staff schema", () => {
	it("aceita servidor válido", () => {
		const parsed = createStaffSchema.safeParse({ name: "João Silva" });
		expect(parsed.success).toBe(true);
	});

	it("aceita papel padrão opcional", () => {
		const parsed = createStaffSchema.safeParse({
			name: "João Silva",
			defaultRoleId: "role-1",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejeita nome vazio", () => {
		const parsed = createStaffSchema.safeParse({ name: "" });
		expect(parsed.success).toBe(false);
	});
});
