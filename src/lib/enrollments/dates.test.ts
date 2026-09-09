import { describe, expect, it } from "vitest";

import {
	dateStringToTimestamp,
	isDateString,
	previousDay,
	timestampToDateString,
} from "./dates";

describe("enrollment dates", () => {
	it("converte YYYY-MM-DD para timestamp à meia-noite UTC", () => {
		expect(dateStringToTimestamp("2026-03-10")).toBe(Date.UTC(2026, 2, 10));
	});

	it("converte timestamp de volta para YYYY-MM-DD", () => {
		expect(timestampToDateString(Date.UTC(2026, 2, 10))).toBe("2026-03-10");
	});

	it("rejeita datas malformadas ou inexistentes", () => {
		expect(isDateString("2026-03-10")).toBe(true);
		expect(isDateString("10/03/2026")).toBe(false);
		expect(isDateString("2026-13-01")).toBe(false);
		expect(isDateString("2026-02-30")).toBe(false);
		expect(isDateString(undefined)).toBe(false);
	});

	it("previousDay subtrai exatamente um dia", () => {
		const start = Date.UTC(2026, 2, 10);
		expect(previousDay(start)).toBe(Date.UTC(2026, 2, 9));
	});
});
