import { describe, expect, it } from "vitest";

import {
	ALLOWED_TRANSITIONS,
	canCreateIndependentRecord,
	canEditLinkedRecord,
	canEditMeetingData,
} from "./transitions";

describe("meeting transitions", () => {
	it("define o mapa de transições do ciclo de vida", () => {
		expect(ALLOWED_TRANSITIONS.draft).toEqual(["start"]);
		expect(ALLOWED_TRANSITIONS.in_progress).toEqual(["finalize"]);
		expect(ALLOWED_TRANSITIONS.finished).toEqual(["reopen"]);
		expect(ALLOWED_TRANSITIONS.reopened).toEqual(["start", "finalize"]);
	});

	it("só permite editar registro vincado em in_progress/reopened", () => {
		expect(canEditLinkedRecord("draft")).toBe(false);
		expect(canEditLinkedRecord("in_progress")).toBe(true);
		expect(canEditLinkedRecord("finished")).toBe(false);
		expect(canEditLinkedRecord("reopened")).toBe(true);
	});

	it("permite editar dados e turmas em draft/in_progress/reopened (bordas 7/8/10)", () => {
		expect(canEditMeetingData("draft")).toBe(true);
		expect(canEditMeetingData("in_progress")).toBe(true);
		expect(canEditMeetingData("reopened")).toBe(true);
		expect(canEditMeetingData("finished")).toBe(false);
	});

	it("permite registro independente em qualquer estado (borda 6)", () => {
		expect(canCreateIndependentRecord()).toBe(true);
	});
});
