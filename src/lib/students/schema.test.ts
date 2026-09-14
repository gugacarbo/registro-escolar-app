import { describe, expect, it } from "vitest";

import { createStudentSchema } from "./schema";

describe("createStudentSchema", () => {
	it("aceita uma reference textual", () => {
		const result = createStudentSchema.safeParse({
			name: "Ana Silva",
			reference: "REF-2026-001",
		});
		expect(result).toMatchObject({
			success: true,
			data: { reference: "REF-2026-001" },
		});
	});

	it("rejects empty name", () => {
		const result = createStudentSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
	});
});
