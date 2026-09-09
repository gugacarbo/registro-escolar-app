import { describe, expect, it } from "vitest";

import {
	createMeetingApiSchema,
	createMeetingParticipantSchema,
	createMeetingSchema,
	transitionMeetingSchema,
} from "./schema";

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

	it("createMeetingApiSchema aplica padrões de turmas e participantes", () => {
		const parsed = createMeetingApiSchema.safeParse({ title: "Conselho" });
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.classIds).toEqual([]);
			expect(parsed.data.participants).toEqual([]);
		}
	});

	it("createMeetingApiSchema aceita templateId nulo e rejeita turma vazia", () => {
		const valid = createMeetingApiSchema.safeParse({
			title: "Conselho",
			templateId: null,
			classIds: ["class-1"],
		});
		expect(valid.success).toBe(true);
		const invalid = createMeetingApiSchema.safeParse({
			title: "Conselho",
			classIds: [""],
		});
		expect(invalid.success).toBe(false);
	});

	it("createMeetingApiSchema exige servidor e papel em cada participante", () => {
		const invalid = createMeetingApiSchema.safeParse({
			title: "Conselho",
			participants: [{ staffId: "staff-1" }],
		});
		expect(invalid.success).toBe(false);
	});

	it("createMeetingApiSchema converte data ISO da UI para Date", () => {
		const parsed = createMeetingApiSchema.safeParse({
			title: "Conselho",
			heldAt: "2026-06-01",
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.heldAt).toBeInstanceOf(Date);
		}
	});

	it("transitionMeetingSchema aceita apenas start, finalize e reopen", () => {
		expect(transitionMeetingSchema.safeParse("start").success).toBe(true);
		expect(transitionMeetingSchema.safeParse("finalize").success).toBe(true);
		expect(transitionMeetingSchema.safeParse("reopen").success).toBe(true);
		expect(transitionMeetingSchema.safeParse("pause").success).toBe(false);
	});
});
