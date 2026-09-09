import { describe, expect, it } from "vitest";

import { createStudentSchema } from "./schema";

describe("createStudentSchema", () => {
	it("rejects empty name", () => {
		const result = createStudentSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
	});
});
