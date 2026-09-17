import { describe, expect, it } from "vitest";
import {
	approveMinuteSchema,
	createMinuteTemplateSchema,
	generateMinuteSchema,
} from "./schema";

describe("minute schemas", () => {
	it("valida createMinuteTemplateSchema com strings e objetos JSON válidos", () => {
		const validString = createMinuteTemplateSchema.safeParse({
			name: "Modelo Teste",
			headerContent: "Cabeçalho texto",
			bodyContent: "Conteúdo da ata",
			footerContent: "Rodapé texto",
		});
		expect(validString.success).toBe(true);
		if (validString.success) {
			expect(validString.data.bodyContent).toBe("Conteúdo da ata");
		}

		const validObject = createMinuteTemplateSchema.safeParse({
			name: "Modelo JSON",
			headerContent: { type: "doc", content: [] },
			footerContent: { type: "paragraph" },
		});
		expect(validObject.success).toBe(true);
	});

	it("rejeita headerContent ou footerContent quando não é objeto ou falta type", () => {
		expect(
			createMinuteTemplateSchema.safeParse({
				name: "Modelo Inválido",
				headerContent: 123,
			}).success,
		).toBe(false);

		expect(
			createMinuteTemplateSchema.safeParse({
				name: "Modelo Inválido",
				headerContent: { noType: true },
			}).success,
		).toBe(false);

		expect(
			createMinuteTemplateSchema.safeParse({
				name: "Modelo Inválido",
				footerContent: 456,
			}).success,
		).toBe(false);

		expect(
			createMinuteTemplateSchema.safeParse({
				name: "Modelo Inválido",
				footerContent: { semType: 1 },
			}).success,
		).toBe(false);
	});

	it("valida generateMinuteSchema e approveMinuteSchema", () => {
		expect(generateMinuteSchema.safeParse({}).success).toBe(true);
		expect(
			generateMinuteSchema.safeParse({ observacao: "Gerado automaticamente" })
				.success,
		).toBe(true);

		expect(approveMinuteSchema.safeParse({}).success).toBe(true);
		expect(
			approveMinuteSchema.safeParse({
				data: "2025-05-10T10:00:00.000Z",
				observacao: "Aprovado em reunião",
			}).success,
		).toBe(true);
	});
});
