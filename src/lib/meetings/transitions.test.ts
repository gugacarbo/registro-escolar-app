import { describe, expect, it } from "vitest";

import {
	ALLOWED_TRANSITIONS,
	canCreateIndependentRecord,
	canEditLinkedRecord,
	canEditMeetingData,
} from "./transitions";

describe("meeting transitions", () => {
	it("define o mapa de transições do ciclo de vida (ADR-0021)", () => {
		expect(ALLOWED_TRANSITIONS.open).toEqual([]);
		expect(ALLOWED_TRANSITIONS.closed).toEqual(["reopen"]);
	});

	it("só permite editar registro vinculado em reunião aberta", () => {
		expect(canEditLinkedRecord("open")).toBe(true);
		expect(canEditLinkedRecord("closed")).toBe(false);
	});

	it("só permite editar dados e turmas em reunião aberta (borda 1)", () => {
		expect(canEditMeetingData("open")).toBe(true);
		expect(canEditMeetingData("closed")).toBe(false);
	});

	it("permite registro independente em qualquer estado (borda 7)", () => {
		expect(canCreateIndependentRecord()).toBe(true);
	});
});
