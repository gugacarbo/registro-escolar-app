import { describe, expect, it } from "vitest";

import { dateStringToTimestamp } from "./dates";
import { mapClassRequestToRow, mapEnrollmentRequestToRow } from "./mapping";

describe("enrollment mapping PT->EN", () => {
	it("mapeia payload de turma", () => {
		expect(
			mapClassRequestToRow({
				nome: "7º A",
				periodoLetivo: "2026",
				curso: "Fundamental",
				serie: "7",
				turno: "manhã",
			}),
		).toEqual({
			name: "7º A",
			academicPeriod: "2026",
			course: "Fundamental",
			grade: "7",
			shift: "manhã",
		});
	});

	it("omite opcionais de turma ausentes", () => {
		expect(
			mapClassRequestToRow({ nome: "7º A", periodoLetivo: "2026" }),
		).toEqual({ name: "7º A", academicPeriod: "2026" });
	});

	it("mapeia payload de vínculo com datas convertidas", () => {
		expect(
			mapEnrollmentRequestToRow({
				estudanteId: "a1",
				turmaId: "t1",
				dataInicio: "2026-02-01",
				dataTermino: "2026-12-15",
				status: "ativa",
			}),
		).toEqual({
			studentId: "a1",
			classId: "t1",
			startDate: new Date(dateStringToTimestamp("2026-02-01")),
			endDate: new Date(dateStringToTimestamp("2026-12-15")),
			status: "ativa",
		});
	});

	it("mantém dataTermino ausente como indefinido (borda 5)", () => {
		const row = mapEnrollmentRequestToRow({
			estudanteId: "a1",
			turmaId: "t1",
			dataInicio: "2026-02-01",
		});
		expect(row.endDate).toBeUndefined();
	});
});
