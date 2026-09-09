import { describe, expect, it } from "vitest";

import {
	createIndependentRecordSchema,
	createLinkedRecordSchema,
	setRecordInclusionSchema,
	updateLinkedRecordSchema,
} from "./schema";

describe("records schema", () => {
	it("aceita registro independente com apenas texto (borda 1: vazio rejeita)", () => {
		const parsed = createIndependentRecordSchema.safeParse({
			texto: "Acompanhamento externo",
		});
		expect(parsed.success).toBe(true);
		const empty = createIndependentRecordSchema.safeParse({ texto: "   " });
		expect(empty.success).toBe(false);
		const missing = createIndependentRecordSchema.safeParse({});
		expect(missing.success).toBe(false);
	});

	it("aceita campos opcionais do payload independente", () => {
		const parsed = createIndependentRecordSchema.safeParse({
			texto: "Registro",
			turmaId: "class-1",
			categoriaId: "cat-1",
			componenteId: "component-1",
			incluirNaAta: false,
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.incluirNaAta).toBe(false);
		}
	});

	it("não aceita origem em registro independente", () => {
		const parsed = createIndependentRecordSchema.safeParse({
			texto: "Registro",
			origemId: "participant-1",
		});
		expect(parsed.success).toBe(false);
	});

	it("payload vinculado exige texto e aceita opcionais", () => {
		const parsed = createLinkedRecordSchema.safeParse({
			texto: "Discussão",
			categoriaId: "cat-1",
			componenteId: "component-1",
			origemId: "participant-1",
			incluirNaAta: true,
		});
		expect(parsed.success).toBe(true);
		const empty = createLinkedRecordSchema.safeParse({ texto: "" });
		expect(empty.success).toBe(false);
	});

	it("update vinculado exige texto (PATCH completo do contrato)", () => {
		const parsed = updateLinkedRecordSchema.safeParse({ texto: "Editado" });
		expect(parsed.success).toBe(true);
		const empty = updateLinkedRecordSchema.safeParse({ texto: " " });
		expect(empty.success).toBe(false);
	});

	it("setRecordInclusionSchema exige booleano", () => {
		expect(setRecordInclusionSchema.safeParse({ incluir: true }).success).toBe(
			true,
		);
		expect(setRecordInclusionSchema.safeParse({ incluir: "sim" }).success).toBe(
			false,
		);
		expect(setRecordInclusionSchema.safeParse({}).success).toBe(false);
	});
});
