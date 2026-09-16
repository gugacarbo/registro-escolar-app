import { describe, expect, it } from "vitest";
import {
	imageFileToInlineBase64,
	isAllowedImageType,
	parseDataUrl,
	readFileAsBase64,
} from "./image-utils";

describe("image-utils", () => {
	describe("isAllowedImageType", () => {
		it("aceita png, jpeg, jpg, webp e gif", () => {
			for (const type of [
				"image/png",
				"image/jpeg",
				"image/jpg",
				"image/webp",
				"image/gif",
			]) {
				expect(isAllowedImageType({ type } as File)).toBe(true);
			}
		});

		it("rejeita formatos fora da allowlist", () => {
			expect(isAllowedImageType({ type: "image/svg+xml" } as File)).toBe(false);
			expect(isAllowedImageType({ type: "application/pdf" } as File)).toBe(
				false,
			);
			expect(isAllowedImageType({ type: "" } as File)).toBe(false);
		});
	});

	describe("parseDataUrl", () => {
		it("extrai mime e base64 de data URL válida", () => {
			const parsed = parseDataUrl("data:image/png;base64,AAAA");
			expect(parsed).toEqual({ mime: "image/png", base64: "AAAA" });
		});

		it("retorna null para data URL inválida", () => {
			expect(parseDataUrl("não é uma data url")).toBeNull();
			expect(parseDataUrl("data:image/png;base64,")).toBeNull();
			expect(parseDataUrl("data:text/plain;base64,AAAA")).toBeNull();
		});
	});

	describe("readFileAsBase64", () => {
		it("resolve com a data URL lida", async () => {
			const file = new File(["abc"], "foto.png", { type: "image/png" });
			const result = await readFileAsBase64(file);
			expect(result).toContain("data:image/png;base64,");
		});
	});

	describe("imageFileToInlineBase64", () => {
		it("retorna erro para formato não suportado", async () => {
			const file = new File(["x"], "foto.svg", { type: "image/svg+xml" });
			const result = await imageFileToInlineBase64(file);
			expect(result.src).toBe("");
			expect(result.error).toContain("Formato não suportado");
		});

		it("retorna erro para imagem acima do limite", async () => {
			const file = new File([new Uint8Array(1024 * 1024 + 1)], "grande.png", {
				type: "image/png",
			});
			const result = await imageFileToInlineBase64(file, { maxSize: 100 });
			expect(result.src).toBe("");
			expect(result.error).toContain("Imagem muito grande");
		});

		it("converte imagem válida dentro do limite", async () => {
			const file = new File(["foto"], "foto.png", { type: "image/png" });
			const result = await imageFileToInlineBase64(file, { maxSize: 1024 });
			expect(result.error).toBeUndefined();
			expect(result.src).toContain("data:image/png;base64,");
			expect(result.alt).toBe("foto.png");
		});
	});
});
