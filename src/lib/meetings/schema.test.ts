import { describe, expect, it } from "vitest";

import { createMeetingParticipantSchema, createMeetingSchema } from "./schema";

describe("meetings schema", () => {
	it("aceita reunião válida", () => {
		const parsed = createMeetingSchema.safeParse({
			title: "Reunião pedagógica",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejeita título vazio", () => {
		const parsed = createMeetingSchema.safeParse({ title: "" });
		expect(parsed.success).toBe(false);
	});

	it("exige servidor e papel na participação", () => {
		const parsed = createMeetingParticipantSchema.safeParse({
			meetingId: "meeting-1",
			staffId: "staff-1",
			roleId: "role-1",
		});
		expect(parsed.success).toBe(true);
		const missing = createMeetingParticipantSchema.safeParse({
			meetingId: "meeting-1",
		});
		expect(missing.success).toBe(false);
	});
});
