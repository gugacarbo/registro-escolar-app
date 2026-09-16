import { describe, expect, it } from "vitest";
import { buildMinutePdf, pdfBytesToBuffer } from "./pdf";
import type { RenderedMinute } from "./render";

const PNG_1X1 =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const JPG_1X1 =
	"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

describe("buildMinutePdf", () => {
	it("gera PDF com textos e elementos de imagem (PNG, JPG, inválidos)", async () => {
		const rendered: RenderedMinute = {
			title: "Ata com Imagens",
			lines: [
				{ text: "Ata com Imagens", level: 1 },
				{ text: "Linha 1", level: 3 },
			],
			elements: [
				{ kind: "line", text: "Cabeçalho da ata", level: 1 },
				{ kind: "line", text: "Subtítulo da ata", level: 2 },
				{ kind: "image", src: PNG_1X1, alt: "PNG válido" },
				{ kind: "image", src: JPG_1X1, alt: "JPG válido" },
				{
					kind: "image",
					src: "https://exemplo.test/imagem.png",
					alt: "URL externa sem data-uri",
				},
				{
					kind: "image",
					src: "data:image/png;base64,lixo-invalido",
					alt: "PNG corrompido",
				},
			],
		};

		const pdfBytes = await buildMinutePdf(rendered, {
			generatedAt: "2025-05-10T14:30:00Z",
		});

		expect(pdfBytes).toBeInstanceOf(Uint8Array);
		expect(pdfBytes.length).toBeGreaterThan(100);

		const buffer = pdfBytesToBuffer(pdfBytes);
		expect(Buffer.isBuffer(buffer)).toBe(true);
	});
});
