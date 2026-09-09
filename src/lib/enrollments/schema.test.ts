import { describe, expect, it } from "vitest";

import { dateStringToTimestamp } from "./dates";
import { createEnrollmentSchema } from "./schema";

describe("createEnrollmentSchema", () => {
	it("aceita vínculo válido sem dataTermino (borda 5)", () => {
		const parsed = createEnrollmentSchema.safeParse({
			studentId: "a1",
			classId: "t1",
			startDate: new Date(dateStringToTimestamp("2026-02-01")),
			status: "ativa",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejeita endDate anterior a startDate", () => {
		const parsed = createEnrollmentSchema.safeParse({
			studentId: "a1",
			classId: "t1",
			startDate: new Date(dateStringToTimestamp("2026-06-01")),
			endDate: new Date(dateStringToTimestamp("2026-02-01")),
			status: "ativa",
		});
		expect(parsed.success).toBe(false);
	});

	it("aceita endDate igual a startDate", () => {
		const parsed = createEnrollmentSchema.safeParse({
			studentId: "a1",
			classId: "t1",
			startDate: new Date(dateStringToTimestamp("2026-02-01")),
			endDate: new Date(dateStringToTimestamp("2026-02-01")),
			status: "concluida",
		});
		expect(parsed.success).toBe(true);
	});
});
